import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { crownDevelopmentToViewModel } from './view-model.js';
import { BOOLEAN_OPTIONS } from '@pins/dynamic-forms/src/components/boolean/question.js';
import { addressToViewModel } from '@pins/dynamic-forms/src/lib/address-utils.js';

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {Date | string} lpaQuestionnaireReceivedDate
 */
export async function sendLpaAcknowledgeReceiptOfQuestionnaireNotification(service, id, lpaQuestionnaireReceivedDate) {
	const { db, logger, notifyClient } = service;

	if (notifyClient === null) {
		logger.warn(
			'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
		);
	} else {
		const { crownDevelopment, crownDevelopmentFields } = await getCrownDevelopmentData(db, id);
		try {
			await notifyClient.sendLpaAcknowledgeReceiptOfQuestionnaire(crownDevelopmentFields.lpaEmail, {
				reference: crownDevelopmentFields.reference,
				applicationDescription: crownDevelopmentFields.description,
				siteAddress: formatSiteLocation(crownDevelopment),
				lpaQuestionnaireReceivedDate: formatDateForDisplay(lpaQuestionnaireReceivedDate),
				frontOfficeLink: `${service.portalBaseUrl}/applications`
			});
		} catch (error) {
			logger.error(
				{ error, reference: crownDevelopmentFields.reference },
				`error dispatching LPA - Acknowledge Receipt of Questionnaire email notification`
			);
			throw new Error('Error encountered during email notification dispatch');
		}
	}
}

/**
 * @param {import('#service').ManageService} service
 * @param {string} id
 * @param {Date | string} applicationReceivedDate
 */
export async function sendApplicationReceivedNotification(service, id, applicationReceivedDate) {
	const { db, logger, notifyClient } = service;
	if (notifyClient === null) {
		logger.warn(
			'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
		);
	} else {
		const { crownDevelopment, crownDevelopmentFields } = await getCrownDevelopmentData(db, id);
		try {
			await notifyClient.sendApplicationReceivedNotification(
				crownDevelopmentFields.agentContactId
					? crownDevelopmentFields.agentContactEmail
					: crownDevelopmentFields.applicantContactEmail,
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
}

export async function sendApplicationNotOfNationalImportanceNotification(service, id) {
	const { db, logger, notifyClient } = service;
	if (notifyClient === null) {
		logger.warn(
			'Gov Notify is not enabled, to use Gov Notify functionality setup Gov Notify environment variables. See README'
		);
	} else {
		const { crownDevelopment, crownDevelopmentFields } = await getCrownDevelopmentData(db, id);
		try {
			await notifyClient.sendApplicationNotOfNationalImportanceNotification(
				crownDevelopmentFields.agentContactId
					? crownDevelopmentFields.agentContactEmail
					: crownDevelopmentFields.applicantContactEmail,
				{
					reference: crownDevelopmentFields.reference,
					applicationDescription: crownDevelopmentFields.description,
					siteAddress: formatSiteLocation(crownDevelopment)
				}
			);
		} catch (error) {
			logger.error(
				{ error, reference: crownDevelopmentFields.reference },
				`error dispatching Application not of national importance email notification`
			);
			throw new Error('Error encountered during email notification dispatch');
		}
	}
}

/**
 * Fetch crown development data
 * @param {import('@prisma/client').PrismaClient} db
 * @param {string} id
 */
async function getCrownDevelopmentData(db, id) {
	const crownDevelopment = await db.crownDevelopment.findUnique({
		where: { id },
		include: { SiteAddress: true, Lpa: true, ApplicantContact: true, AgentContact: true }
	});

	const crownDevelopmentFields = crownDevelopmentToViewModel(crownDevelopment);

	return { crownDevelopment, crownDevelopmentFields };
}

/**
 * Format site address depending on what is set on the case
 * @param {import('@priam/client').CrownDevelopment} crownDevelopment
 */
function formatSiteLocation(crownDevelopment) {
	if (crownDevelopment.siteAddressId) {
		return addressToViewModel(crownDevelopment.SiteAddress);
	} else if (crownDevelopment.siteNorthing || crownDevelopment.siteEasting) {
		return [
			`Northing: ${crownDevelopment.siteNorthing || '-'}`,
			`Easting: ${crownDevelopment.siteEasting || '-'}`
		].join(' , ');
	} else {
		return 'Site location not provided';
	}
}
