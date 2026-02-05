import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { crownDevelopmentToViewModel } from './view-model.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { addressToViewModel } from '@planning-inspectorate/dynamic-forms/src/lib/address-utils.js';
import { caseReferenceToFolderName, grantLpaSharePointAccess } from '@pins/crowndev-lib/util/sharepoint-path.js';

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {Date | string} lpaQuestionnaireReceivedDate
 */
export async function sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, lpaQuestionnaireReceivedDate) {
	const notificationContext = await prepareNotificationContext(service, id);
	if (!notificationContext) return;

	const { notifyClient, logger, crownDevelopment, crownDevelopmentFields } = notificationContext;

	try {
		const personalisation = {
			reference: crownDevelopmentFields.reference,
			applicationDescription: crownDevelopmentFields.description,
			siteAddress: formatSiteLocation(crownDevelopment),
			lpaQuestionnaireReceivedDate: formatDateForDisplay(lpaQuestionnaireReceivedDate),
			frontOfficeLink: `${service.portalBaseUrl}/applications`
		};
		const lpaRecipientEmails = [crownDevelopmentFields.lpaEmail, crownDevelopmentFields.secondaryLpaEmail].filter(
			Boolean
		);
		const notifyRequests = lpaRecipientEmails.map((email) =>
			notifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire(email, personalisation)
		);
		await Promise.all(notifyRequests);
	} catch (error) {
		logger.error(
			{ error, reference: crownDevelopmentFields.reference },
			`error dispatching LPA - Acknowledge Receipt of Questionnaire email notification`
		);
		throw new Error('Error encountered during email notification dispatch');
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {Date | string} applicationReceivedDate
 */
export async function sendApplicationReceivedNotification(service, id, applicationReceivedDate) {
	const notificationContext = await prepareNotificationContext(service, id);
	if (!notificationContext) return;

	const { notifyClient, logger, crownDevelopment, crownDevelopmentFields } = notificationContext;

	try {
		await notifyClient.sendApplicationReceivedNotification(
			getRecipientEmail(crownDevelopmentFields),
			{
				reference: crownDevelopmentFields.reference,
				applicationDescription: crownDevelopmentFields.description,
				siteAddress: formatSiteLocation(crownDevelopment),
				applicationReceivedDate: formatDateForDisplay(applicationReceivedDate),
				fee: crownDevelopmentFields.applicationFee?.toFixed(2) || ''
			},
			crownDevelopmentFields.hasApplicationFee === BOOLEAN_OPTIONS.YES
		);
	} catch (error) {
		logger.error(
			{ error, reference: crownDevelopmentFields.reference },
			`error dispatching Application Received email notification`
		);
		throw new Error('Error encountered during email notification dispatch');
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 */
export async function sendApplicationNotOfNationalImportanceNotification(service, id) {
	const notificationContext = await prepareNotificationContext(service, id);
	if (!notificationContext) return;

	const { notifyClient, logger, crownDevelopment, crownDevelopmentFields } = notificationContext;

	try {
		await notifyClient.sendApplicationNotOfNationalImportanceNotification(getRecipientEmail(crownDevelopmentFields), {
			reference: crownDevelopmentFields.reference,
			applicationDescription: crownDevelopmentFields.description,
			siteAddress: formatSiteLocation(crownDevelopment)
		});
	} catch (error) {
		logger.error(
			{ error, reference: crownDevelopmentFields.reference },
			`error dispatching Application not of national importance email notification`
		);
		throw new Error('Error encountered during email notification dispatch');
	}
}
/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 */
export async function sendLpaQuestionnaireSentNotification(service, id) {
	const notificationContext = await prepareNotificationContext(service, id);
	if (!notificationContext) return;

	const { notifyClient, logger, crownDevelopment, crownDevelopmentFields } = notificationContext;

	try {
		const isEIA = crownDevelopmentFields.environmentalImpactAssessment === BOOLEAN_OPTIONS.YES;
		const isStandard = crownDevelopmentFields.developmentPlan === BOOLEAN_OPTIONS.YES && !isEIA;
		const sharePointDrive = service.appSharePointDrive;

		let sharePointLink = null;
		if (sharePointDrive) {
			try {
				const folderName = caseReferenceToFolderName(crownDevelopmentFields.reference);
				const inviteLink = await grantLpaSharePointAccess(sharePointDrive, crownDevelopment, folderName);
				if (inviteLink) {
					sharePointLink = inviteLink;
				} else {
					logger.warn({ reference: crownDevelopmentFields.reference }, 'SharePoint invite link for LPA was empty');
				}
			} catch (spError) {
				logger.warn(
					{ error: spError, reference: crownDevelopmentFields.reference },
					'failed to grant LPA SharePoint access or fetch link'
				);
			}
		}

		const personalisation = {
			reference: crownDevelopmentFields.reference,
			lpaName: crownDevelopment?.Lpa?.name,
			description: crownDevelopmentFields.description,
			siteAddress: formatSiteLocation(crownDevelopment),
			dateAccepted: formatDateForDisplay(crownDevelopmentFields.applicationAcceptedDate),
			sharePointLink,
			lpaQuestionnaireReceivedDate: formatDateForDisplay(crownDevelopmentFields.lpaQuestionnaireReceivedDate),
			frontOfficeLink: `${service.portalBaseUrl}/applications`,
			notEIA: !isEIA,
			isEIA,
			isStandard,
			isSpecial: !isStandard,
			representationEndDate: formatDateForDisplay(crownDevelopmentFields.representationsPeriod?.end || '')
		};

		const lpaRecipientEmails = [crownDevelopment?.Lpa?.email, crownDevelopment?.SecondaryLpa?.email].filter(Boolean);
		const notifyRequests = lpaRecipientEmails.map((email) =>
			notifyClient.sendLpaQuestionnaireNotification(email, personalisation)
		);
		await Promise.all(notifyRequests);
	} catch (error) {
		logger.error(
			{ error, reference: crownDevelopmentFields?.reference },
			'error dispatching LPA questionnaire sent email notification'
		);
		throw error;
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 */
async function prepareNotificationContext(service, id) {
	const { db, logger, notifyClient } = service;

	if (!notifyClient) {
		logger.warn(
			'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
		);
		return null;
	}

	const { crownDevelopment, crownDevelopmentFields } = await getCrownDevelopmentData(db, id);
	return { notifyClient, logger, crownDevelopment, crownDevelopmentFields };
}

/**
 * Fetch crown development data
 * @param {import('@pins/crowndev-database').PrismaClient} db
 * @param {string} id
 */
async function getCrownDevelopmentData(db, id) {
	const crownDevelopment = await db.crownDevelopment.findUnique({
		where: { id },
		include: {
			SiteAddress: true,
			Lpa: true,
			SecondaryLpa: true,
			ApplicantContact: true,
			AgentContact: true
		}
	});

	const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment);

	return { crownDevelopment, crownDevelopmentFields };
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} crownDevelopmentFields
 * @returns {string} recipient email address
 */
function getRecipientEmail(crownDevelopmentFields) {
	return crownDevelopmentFields.agentContactId
		? crownDevelopmentFields.agentContactEmail
		: crownDevelopmentFields.applicantContactEmail;
}

/**
 * Format site address depending on what is set on the case
 * @param {import('@priam/client').CrownDevelopment} crownDevelopment
 */
function formatSiteLocation(crownDevelopment) {
	if (crownDevelopment.siteAddressId) {
		return addressToViewModel(crownDevelopment.SiteAddress);
	} else if (crownDevelopment.siteEasting || crownDevelopment.siteNorthing) {
		return [
			`Easting: ${crownDevelopment.siteEasting || '-'}`,
			`Northing: ${crownDevelopment.siteNorthing || '-'}`
		].join(' , ');
	} else {
		return 'Site location not provided';
	}
}
