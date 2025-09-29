import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';
import { toFloat } from '@pins/crowndev-lib/util/numbers.js';
import { caseReferenceToFolderName, getSharePointReceivedPathId } from '@pins/crowndev-lib/util/sharepoint-path.js';
import { yesNoToBoolean } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { APPLICATION_SUB_TYPE_ID, APPLICATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

/**
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildSaveController(service) {
	const { db, getSharePointDrive, logger, notifyClient } = service;
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
		let id;
		// create a new case in a transaction to ensure reference generation is safe
		await db.$transaction(async ($tx) => {
			async function createCase(reference, subType, extraData = {}) {
				const input = toCreateInput(answers, reference, subType);
				Object.assign(input, extraData);
				logger.info({ reference }, 'creating a new case');
				const created = await $tx.crownDevelopment.create({ data: input });
				logger.info({ reference }, 'created a new case');
				return created;
			}

			reference = await newReference($tx);
			const isPlanningAndLbcCase =
				answers.typeOfApplication === APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT;
			const subType = isPlanningAndLbcCase ? APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION : null;

			const created = await createCase(reference, subType);
			id = created.id;

			if (isPlanningAndLbcCase) {
				await createCase(`${reference}/LBC`, APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT, {
					ParentCrownDevelopment: { connect: { id } }
				});
			}
		});

		const sharePointDrive = getSharePointDrive(req.session);
		let notificationData = {};

		if (sharePointDrive === null) {
			logger.warn(
				'SharePoint not enabled, to use SharePoint functionality setup SharePoint environment variables. See README'
			);
		} else {
			notificationData = await createCaseSharePointActions(
				sharePointDrive,
				service.sharePointCaseTemplateId,
				caseReferenceToFolderName(reference),
				answers
			);
		}
		// todo: redirect to check-your-answers on failure?

		if (notifyClient === null) {
			logger.warn(
				'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
			);
		} else if (answers.typeOfApplication !== APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT) {
			try {
				await notifyClient.sendAcknowledgePreNotification(notificationData.recipientEmail, {
					reference,
					sharePointLink: notificationData.sharePointLink
				});
			} catch (error) {
				logger.error({ error, reference }, `error dispatching Acknowledgement of pre-notification email notification`);
				throw new Error('Error encountered during email notification dispatch');
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
export function buildSuccessController({ db, logger }) {
	return async (req, res) => {
		const data = req.session?.forms && req.session?.forms[JOURNEY_ID];
		if (!data || !data.id || !data.reference) {
			throw new Error('invalid create case session');
		}

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id: data.id }
		});

		const linkedCaseId = crownDevelopment?.linkedCaseId;
		const hasLinkedCase = typeof linkedCaseId === 'string' && linkedCaseId.trim() !== '';
		let linkedCase;
		if (hasLinkedCase) {
			try {
				linkedCase = await db.crownDevelopment.findUnique({
					where: { id: linkedCaseId },
					select: { reference: true }
				});
			} catch (error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching linked case',
					logParams: { linkedCaseId }
				});
			}
		}

		clearDataFromSession({ req, journeyId: JOURNEY_ID });
		res.render('views/cases/create-a-case/success.njk', {
			title: 'Case created',
			bodyText: `Case reference <br><strong>${data.reference}</strong>${hasLinkedCase ? `<br><br><strong>${linkedCase.reference}</strong>` : ''}`,
			successBackLinkUrl: `/cases/${data.id}`,
			successBackLinkText: `View case details for ${data.reference}`,
			hasLinkedCase,
			successBackLinkLinkedCaseUrl: hasLinkedCase ? `/cases/${linkedCaseId}` : '',
			successBackLinkLinkedCaseText: hasLinkedCase ? `View case details for ${linkedCase.reference}` : ''
		});
	};
}

/**
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @param {string} reference
 * @param {string|null} subType
 * @returns {import('@prisma/client').Prisma.CrownDevelopmentCreateInput}
 */
function toCreateInput(answers, reference, subType) {
	/** @type {import('@prisma/client').Prisma.CrownDevelopmentCreateInput} */
	const input = {
		reference,
		description: answers.developmentDescription,
		Lpa: { connect: { id: answers.lpaId } },
		Type: { connect: { id: answers.typeOfApplication } },
		Status: { connect: { id: 'new' } },
		siteArea: toFloat(answers.siteArea),
		siteEasting: toFloat(answers.siteEasting),
		siteNorthing: toFloat(answers.siteNorthing),
		expectedDateOfSubmission: answers.expectedDateOfSubmission
	};

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

	if (hasAnswers(answers, 'applicant')) {
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

	if (hasAnswers(answers, 'agent')) {
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
 * @param {import('./types.d.ts').Address} address
 * @returns {import('@prisma/client').Prisma.AddressCreateInput}
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
 * Have any of the answers with a given prefix got an answer
 *
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @param {string} prefix
 * @returns {boolean}
 */
function hasAnswers(answers, prefix) {
	return Object.entries(answers)
		.filter(([k]) => k.startsWith(prefix))
		.some(([, v]) => Boolean(v));
}

/**
 * Generate a new case reference
 *
 * @param {import('@prisma/client').PrismaClient} db
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
	if (hasAnswers(answers, 'applicant') && answers.applicantEmail) {
		users.push({ email: answers.applicantEmail, id: '' });
	}

	if (hasAnswers(answers, 'agent') && answers.agentEmail) {
		users.push({ email: answers.agentEmail, id: '' });
	}

	await sharePointDrive.addItemPermissions(applicantReceivedFolderId, { role: 'write', users: users });
	// todo: Add LPA permissions too.

	return await sharePointDrive.fetchUserInviteLink(applicantReceivedFolderId);
}

/**
 *
 * @param {SharePointDrive} sharePointDrive
 * @param {string} caseTemplateId
 * @param {string} folderName
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @returns {Promise<{recipientEmail: string, sharePointLink: string}>}
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
		recipientEmail: yesNoToBoolean(answers.hasAgent) ? answers.agentEmail : answers.applicantEmail,
		sharePointLink: inviteLink.link.webUrl
	};
}
