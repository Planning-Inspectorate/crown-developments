import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';
import { toFloat } from '@pins/crowndev-lib/util/numbers.js';
import { caseReferenceToFolderName, getSharePointReceivedPathId } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import {
	APPLICATION_SUB_TYPE_ID,
	APPLICATION_TYPE_ID,
	ORGANISATION_ROLES_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { getLinkedCaseId, hasLinkedCase as hasLinkedCaseFunction } from '@pins/crowndev-lib/util/linked-case.js';
import { extractAgentContactFields, extractApplicantContactFields } from '../util/contact.js';
import { getRecipientEmails } from '../view/notification.js';

/**
 * @typedef {import('./types.d.ts').CreateCaseAnswers} CreateCaseAnswers
 * @typedef {import('@pins/crowndev-database').Prisma.CrownDevelopmentCreateInput} CrownDevelopmentCreateInput
 * @typedef {import('@pins/crowndev-sharepoint/src/sharepoint/drives/drives.js').SharePointDrive} SharePointDrive
 * @typedef {import('@pins/crowndev-lib/govnotify/gov-notify-client.js').GovNotifyClient} GovNotifyClient
 * @typedef {{ kind: 'many', recipientEmails: string[], sharePointLink: string }} NotificationDataMany
 * @typedef {{ kind: 'one', recipientEmail: string, sharePointLink: string }} NotificationDataOne
 * @typedef {NotificationDataMany | NotificationDataOne} NotificationData
 */

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildSaveController(service) {
	const { db, appSharePointDrive, logger, notifyClient } = service;
	return async (req, res) => {
		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		/** @type {import('@planning-inspectorate/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
		const journeyResponse = res.locals.journeyResponse;
		/**
		 * @type {import('./types.d.ts').CreateCaseAnswers}
		 */
		const answers = journeyResponse.answers;
		if (typeof answers !== 'object') {
			throw new Error('answers should be an object');
		}
		let reference;
		let lbcReference;
		let id;
		const isPlanningAndLbcCase = answers.typeOfApplication === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT;
		// create a new case in a transaction to ensure reference generation is safe
		await db.$transaction(async ($tx) => {
			/**
			 * @typedef {import('@pins/crowndev-database').Prisma.CrownDevelopmentCreateArgs['data']} CrownDevelopmentData
			 */

			/**
			 * @typedef {import('@pins/crowndev-database').Prisma.CrownDevelopmentGetPayload<{ include: {} }>} CreatedCrownDevelopment
			 */

			/**
			 * @param {string} reference
			 * @param {string|null} subType
			 * @param {Partial<CrownDevelopmentData>} [extraData={}]
			 * @returns {Promise<CreatedCrownDevelopment>}
			 */
			async function createCase(reference, subType, extraData = {}) {
				const input = toCreateInput(answers, reference, subType);
				Object.assign(input, extraData);
				logger.info({ reference }, 'creating a new case');
				const created = await $tx.crownDevelopment.create({ data: input });
				logger.info({ reference }, 'created a new case');
				return created;
			}

			reference = await newReference($tx);
			lbcReference = `${reference}/LBC`;
			const subType = isPlanningAndLbcCase ? APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION : null;

			const created = await createCase(reference, subType);
			id = created.id;

			if (isPlanningAndLbcCase) {
				await createCase(lbcReference, APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT, {
					ParentCrownDevelopment: { connect: { id } }
				});
			}
		});

		if (!reference || !lbcReference) {
			throw new Error('Failed to generate case reference');
		}

		let notificationData = null;
		let lbcNotificationData = null;

		if (appSharePointDrive === null) {
			logger.warn(
				'SharePoint not enabled, to use SharePoint functionality setup SharePoint environment variables. See README'
			);
		} else {
			notificationData = await getNotificationData(service, appSharePointDrive, reference, answers);
			if (isPlanningAndLbcCase) {
				lbcNotificationData = await getNotificationData(service, appSharePointDrive, lbcReference, answers);
			}
		}
		// todo: redirect to check-your-answers on failure?

		if (notifyClient === null) {
			logger.warn(
				'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
			);
		} else {
			await sendAcknowledgementPreNotification(notificationData, notifyClient, reference, logger, false);

			if (isPlanningAndLbcCase) {
				await sendAcknowledgementPreNotification(lbcNotificationData, notifyClient, lbcReference, logger, true);
			}
		}

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID,
			replaceWith: {
				id,
				reference
			}
		});

		res.redirect(`${req.baseUrl}/success`);
	};
}

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildSuccessController({ db }) {
	return async (req, res) => {
		const data = req.session?.forms && req.session?.forms[JOURNEY_ID];
		if (!data || !data.id || !data.reference) {
			throw new Error('invalid create case session');
		}

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id: data.id },
			include: {
				ChildrenCrownDevelopment: { select: { id: true, reference: true } }
			}
		});

		const hasLinkedCase = hasLinkedCaseFunction(crownDevelopment);
		const linkedCaseReference = hasLinkedCase
			? crownDevelopment?.ChildrenCrownDevelopment?.find(() => true)?.reference
			: '';

		clearDataFromSession({ req, journeyId: JOURNEY_ID });
		res.render('views/cases/create-a-case/success.njk', {
			title: `${hasLinkedCase ? 'Cases' : 'Case'} created`,
			bodyText: `Case reference <br><strong>${data.reference}</strong>${hasLinkedCase ? `<br><br><strong>${linkedCaseReference}</strong>` : ''}`,
			successBackLinkUrl: `/cases/${data.id}`,
			successBackLinkText: `View case details for ${data.reference}`,
			hasLinkedCase,
			successBackLinkLinkedCaseUrl: hasLinkedCase ? `/cases/${getLinkedCaseId(crownDevelopment)}` : '',
			successBackLinkLinkedCaseText: hasLinkedCase ? `View case details for ${linkedCaseReference}` : ''
		});
	};
}

/**
 * Validate that all contacts are linked to an organisation in the answers.
 * This is an extra safety check - the UI should prevent this from happening, but we want to be sure before we try to create records in the database.
 * @param {CreateCaseAnswers} answers
 */
function validateOrphanedContacts(answers) {
	if (!hasAnswers(answers, 'manageApplicantDetails') || !hasAnswers(answers, 'manageApplicantContactDetails')) {
		return;
	}

	answers.manageApplicantContactDetails.forEach((contact) => {
		const selector = contact.applicantContactOrganisation;
		if (!selector) throw new Error('Unable to match applicant contact to organisation - no valid selector');

		// Bail if we have a match
		if (answers.manageApplicantDetails.some((detail) => detail.id && detail.id === selector)) return;

		throw new Error(
			`Found an orphaned contact with selector "${selector}" that does not match any organisation: ${contact.applicantContactEmail}`
		);
	});
}

/**
 * Build organisations and their contacts from applicants.
 *
 * Because Prisma doesn't allow nested createMany with relations, we have to map to individual
 * creates for organisations and their contacts.
 *
 * @param {CreateCaseAnswers} answers
 * @returns {Array<{Organisation: {create: import('@pins/crowndev-database').Prisma.OrganisationCreateInput}}>|null}
 */
function buildApplicantOrganisationCreates(answers) {
	if (!hasAnswers(answers, 'manageApplicantDetails')) {
		return null;
	}

	validateOrphanedContacts(answers);

	return answers.manageApplicantDetails.map((applicantDetail) => {
		/** @type {import('@pins/crowndev-database').Prisma.OrganisationCreateInput} */
		const organisationCreate = {
			name: applicantDetail.organisationName.trim(),
			// Only create an address if at least one field is filled in
			Address:
				applicantDetail.organisationAddress && Object.values(applicantDetail.organisationAddress || {}).some((v) => v)
					? { create: toAddressInput(applicantDetail.organisationAddress) }
					: undefined
		};

		if (hasAnswers(answers, 'manageApplicantContactDetails')) {
			const linkedContacts = answers.manageApplicantContactDetails.filter((contact) => {
				const selector = contact.applicantContactOrganisation;
				if (!selector) throw new Error('Unable to match applicant contact to organisation - no valid selector');

				// Match by ID (if session data has IDs)
				return !!(applicantDetail.id && selector === applicantDetail.id);
			});

			// Organisations without contacts are valid in the hasAgent case.
			if (linkedContacts.length > 0) {
				organisationCreate.OrganisationToContact = {
					create: linkedContacts.map((contact) => ({
						Contact: {
							create: extractApplicantContactFields(contact)
						}
					}))
				};
			}
		}

		return {
			Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
			Organisation: {
				create: organisationCreate
			}
		};
	});
}

/**
 * Build the single agent organisation and its contacts.
 *
 * @param {CreateCaseAnswers} answers
 * @returns {Array<{Organisation: {create: import('@pins/crowndev-database').Prisma.OrganisationCreateInput}}>|null}
 */
function buildAgentOrganisationCreates(answers) {
	if (!hasAnswers(answers, 'hasAgent')) {
		return null;
	}

	if (!yesNoToBoolean(answers.hasAgent)) {
		return null;
	}

	// For the old flow - hasAgent might be true without multiple agent contacts
	// TODO - throw error after migration CROWN-1509
	if (!hasAnswers(answers, 'manageAgentContactDetails')) {
		return null;
	}

	if (!hasAnswers(answers, 'agentOrganisationName')) {
		throw new Error('Agent name is required when the case has an agent');
	}

	return [
		{
			Role: { connect: { id: ORGANISATION_ROLES_ID.AGENT } },
			Organisation: {
				create: {
					name: answers.agentOrganisationName.trim(),
					// Only create an address if at least one field is filled in
					Address:
						answers.agentOrganisationAddress && Object.values(answers.agentOrganisationAddress || {}).some((v) => v)
							? { create: toAddressInput(answers.agentOrganisationAddress) }
							: undefined,
					OrganisationToContact: {
						create: answers.manageAgentContactDetails.map((contact) => ({
							Contact: {
								create: extractAgentContactFields(contact)
							}
						}))
					}
				}
			}
		}
	];
}

/**
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @param {string} reference
 * @param {string|null} subType
 * @returns {CrownDevelopmentCreateInput}
 */
export function toCreateInput(answers, reference, subType) {
	/** @type CrownDevelopmentCreateInput */
	const input = {
		reference,
		description: answers.developmentDescription,
		Lpa: { connect: { id: answers.lpaId } },
		Type: { connect: { id: answers.typeOfApplication } },
		Status: { connect: { id: 'new' } },
		siteArea: toFloat(answers.siteArea),
		siteEasting: toFloat(answers.siteEasting),
		siteNorthing: toFloat(answers.siteNorthing),
		expectedDateOfSubmission: answers.expectedDateOfSubmission,
		hasSecondaryLpa: yesNoToBoolean(answers.hasSecondaryLpa),
		containsDistressingContent: yesNoToBoolean(answers.containsDistressingContent),
		hasAgent: yesNoToBoolean(answers.hasAgent)
	};

	if (input.hasSecondaryLpa && answers.secondaryLpaId) {
		input.SecondaryLpa = { connect: { id: answers.secondaryLpaId } };
	}

	if (subType) {
		input.SubType = { connect: { id: subType } };
	}

	if (subType === APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT) {
		input.hasApplicationFee = false;
	}

	if (hasAnswers(answers, 'siteAddress')) {
		input.SiteAddress = {
			create: toAddressInput(answers.siteAddress)
		};
	}

	const organisationsCreate = [
		...(buildAgentOrganisationCreates(answers) ?? []),
		...(buildApplicantOrganisationCreates(answers) ?? [])
	];
	if (organisationsCreate.length > 0) {
		input.Organisations = { create: organisationsCreate };
	}

	// TODO remove once multiple entities complete CROWN-1509
	if (hasAnswersBeginningWith(answers, ORGANISATION_ROLES_ID.APPLICANT)) {
		input.ApplicantContact = {
			create: {
				orgName: answers.applicantName,
				email: answers.applicantEmail,
				telephoneNumber: answers.applicantTelephoneNumber
			}
		};
		if (answers.applicantAddress) {
			input.ApplicantContact.create.Address = {
				create: toAddressInput(answers.applicantAddress)
			};
		}
	}

	// TODO remove once multiple entities complete CROWN-1509
	if (hasAnswersBeginningWith(answers, ORGANISATION_ROLES_ID.AGENT)) {
		input.AgentContact = {
			create: {
				orgName: answers.agentName,
				email: answers.agentEmail,
				telephoneNumber: answers.agentTelephoneNumber
			}
		};
		if (answers.agentAddress) {
			input.AgentContact.create.Address = {
				create: toAddressInput(answers.agentAddress)
			};
		}
	}

	return input;
}

/**
 * @param {import('@planning-inspectorate/dynamic-forms/src/lib/address.js').Address} address
 * @returns {import('@pins/crowndev-database').Prisma.AddressCreateInput}
 */
function toAddressInput(address) {
	return {
		line1: address.addressLine1,
		line2: address.addressLine2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
	};
}

/**
 * Have any of the answers with a given prefix got an answer?
 * TODO: Because this uses startsWith(prefix) it doesn't infer types well - replace with hasAnswers where possible CROWN-1509
 *
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @param {string} prefix
 * @returns {boolean}
 */
function hasAnswersBeginningWith(answers, prefix) {
	return Object.entries(answers)
		.filter(([k]) => k.startsWith(prefix))
		.some(([, v]) => Boolean(v));
}

/**
 * Does an answer with the exact given key exist and have a value?
 *
 * @template {keyof CreateCaseAnswers} K
 * @param {CreateCaseAnswers} answers
 * @param {K} key
 * @returns {answers is CreateCaseAnswers & Required<Pick<CreateCaseAnswers, K>>}
 */
function hasAnswers(answers, key) {
	const value = answers[key];
	return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

/**
 * Generate a new case reference
 *
 * @param {Omit<import('@pins/crowndev-database').PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>} db
 * @param {Date} [date]
 * @returns {Promise<string>}
 */
export async function newReference(db, date = new Date()) {
	const latestCases = await db.crownDevelopment.findMany({
		select: { reference: true },
		take: 2, // only check the last few (we should only need the latest one)
		orderBy: {
			reference: 'desc'
		}
	});
	let latestId = 0;
	if (latestCases.length > 0) {
		// find first valid ID
		for (const latestCase of latestCases) {
			const id = idFromReference(latestCase.reference);
			if (id !== null) {
				latestId = id;
				break;
			}
		}
	}

	const year = formatDateForDisplay(date, { format: 'yyyy' });
	const id = (latestId + 1).toString().padStart(7, '0');

	return `CROWN/${year}/${id}`;
}

/**
 * Extract the ID part of the case reference
 *
 * @param {string} reference - <prefix>/<year>/<id>
 * @returns {number|null}
 */
function idFromReference(reference = '') {
	const parts = reference.split('/');
	if (parts.length === 3) {
		// parts are: CROWN, year, id
		const id = parseInt(parts[2]);
		if (!isNaN(id)) {
			return id;
		}
	}
	return null;
}

/**
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @param {string} folderName
 * @returns {Promise<import('@microsoft/microsoft-graph-types').Permission>}
 */
async function grantUsersAccess(sharePointDrive, answers, folderName) {
	const applicantReceivedFolderId = await getSharePointReceivedPathId(sharePointDrive, {
		caseRootName: folderName,
		user: 'Applicant'
	});

	const users = [];
	if (hasAnswersBeginningWith(answers, ORGANISATION_ROLES_ID.APPLICANT) && answers.applicantEmail) {
		users.push({ email: answers.applicantEmail, id: '' });
	}

	if (hasAnswersBeginningWith(answers, ORGANISATION_ROLES_ID.AGENT) && answers.agentEmail) {
		users.push({ email: answers.agentEmail, id: '' });
	}

	await sharePointDrive.addItemPermissions(applicantReceivedFolderId, { role: 'write', users: users });
	// todo: Add LPA permissions too.

	return await sharePointDrive.fetchUserInviteLink(applicantReceivedFolderId);
}

/**
 * Grant Sharepoint access to all relevant users for a case, including multiple applicants if applicable.
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @param {string} folderName
 * @returns {Promise<import('@microsoft/microsoft-graph-types').Permission>}
 */
async function grantUsersAccessV2(sharePointDrive, answers, folderName) {
	const applicantReceivedFolderId = await getSharePointReceivedPathId(sharePointDrive, {
		caseRootName: folderName,
		user: 'Applicant'
	});

	/** @type {Array<{ email: string, id: string }>} */
	const users = [];

	if (hasAnswers(answers, 'manageApplicantContactDetails')) {
		answers.manageApplicantContactDetails.forEach((contact) => {
			if (contact.applicantContactEmail) {
				users.push({ email: contact.applicantContactEmail, id: '' });
			}
		});
	}
	// 	TODO agents CROWN-1311

	await sharePointDrive.addItemPermissions(applicantReceivedFolderId, { role: 'write', users: users });
	// todo: Add LPA permissions too.

	return sharePointDrive.fetchUserInviteLink(applicantReceivedFolderId);
}

/**
 * TODO remove when multiple applicants is live CROWN-1509
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {string} caseTemplateId
 * @param {string} folderName
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @returns {Promise<NotificationDataOne>}
 */
async function createCaseSharePointActions(sharePointDrive, caseTemplateId, folderName, answers) {
	// Copy template folder structure and rename to %folderName%
	await sharePointDrive.copyDriveItem({
		copyItemId: caseTemplateId,
		newItemName: folderName
	});
	// Grant write access to applicant and agent as required
	const inviteLink = await grantUsersAccess(sharePointDrive, answers, folderName);

	return {
		kind: 'one',
		recipientEmail: yesNoToBoolean(answers.hasAgent) ? answers.agentEmail : answers.applicantEmail,
		sharePointLink: inviteLink.link.webUrl
	};
}

/**
 * Copy the SharePoint case template, grant access to all relevant users, validate the invite link
 * and return notification data for multiple recipients.
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {string} caseTemplateId
 * @param {string} folderName
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @returns {Promise<NotificationDataMany>}
 */
async function createCaseSharePointActionsV2(sharePointDrive, caseTemplateId, folderName, answers) {
	// Copy template folder structure and rename to %folderName%
	await sharePointDrive.copyDriveItem({
		copyItemId: caseTemplateId,
		newItemName: folderName
	});
	// Grant write access to applicant and agent as required
	const inviteLink = await grantUsersAccessV2(sharePointDrive, answers, folderName);

	if (!inviteLink || !inviteLink.link || !inviteLink.link.webUrl) {
		throw new Error('Failed to get SharePoint invite link');
	}

	return {
		kind: 'many',
		recipientEmails: getRecipientEmails(answers),
		sharePointLink: inviteLink.link.webUrl
	};
}

/**
 * Send acknowledgement pre-notification email, handling the case where the notification data may not be available and logging appropriately.
 *
 * @param {NotificationData|null} notificationData
 * @param {GovNotifyClient} notifyClient
 * @param {string} reference
 * @param {import('pino').Logger} logger
 * @param {boolean} [isLbcCase=false] - Whether this is a listed building consent case, which requires different email content
 * @return {Promise<void>}
 */
async function sendAcknowledgementPreNotification(
	notificationData,
	notifyClient,
	reference,
	logger,
	isLbcCase = false
) {
	if (!notificationData) {
		throw new Error(`Notification data not available, cannot send email notification for ${reference}`);
	}

	try {
		switch (notificationData.kind) {
			case 'many':
				await notifyClient.sendAcknowledgePreNotificationToMany(notificationData.recipientEmails, {
					reference: reference,
					sharePointLink: notificationData.sharePointLink,
					isLbcCase
				});
				break;
			case 'one':
				await notifyClient.sendAcknowledgePreNotification(notificationData.recipientEmail, {
					reference: reference,
					sharePointLink: notificationData.sharePointLink,
					isLbcCase
				});
				break;
		}
	} catch (error) {
		logger.error({ error, reference }, `error dispatching Acknowledgement of pre-notification email notification`);
		throw new Error('Error encountered during email notification dispatch', { cause: error });
	}
}

/**
 * Get the data needed to send a notification email, including generating the SharePoint folder and invite link.
 *
 * @param {import('#service').ManageService} service
 * @param {SharePointDrive} appSharePointDrive
 * @param {string} reference
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @returns {Promise<NotificationData>}
 */
async function getNotificationData(service, appSharePointDrive, reference, answers) {
	if (!service.sharePointCaseTemplateId) {
		throw new Error(
			'SharePoint case template ID is not configured. Please set the sharePointCaseTemplateId environment variable.'
		);
	}

	return service.isMultipleApplicantsLive
		? await createCaseSharePointActionsV2(
				appSharePointDrive,
				service.sharePointCaseTemplateId,
				caseReferenceToFolderName(reference),
				answers
			)
		: await createCaseSharePointActions(
				appSharePointDrive,
				service.sharePointCaseTemplateId,
				caseReferenceToFolderName(reference),
				answers
			);
}
