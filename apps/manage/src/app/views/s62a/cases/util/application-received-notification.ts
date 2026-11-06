import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import { formatAddress } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { MAJOR_OR_NON_MAJOR_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { S62aCaseViewModel } from '../view/view-model.ts';

export function getApplicationReceivedNotificationMissingFields(answers: S62aCaseViewModel): string[] {
	const missingFields: string[] = [];

	const hasAgentEmail = answers.manageAgentContactDetails?.some((contact) => Boolean(contact.agentContactEmail));
	const hasApplicantEmail = answers.manageApplicantContactDetails?.some((contact) =>
		Boolean(contact.applicantContactEmail)
	);

	if (!hasAgentEmail && !hasApplicantEmail) {
		missingFields.push('the applicant or agent email address');
	}

	const hasSiteAddress = formatAddress(answers.siteAddress) !== '-';
	const hasSiteCoordinates =
		answers.siteEasting !== null &&
		answers.siteEasting !== undefined &&
		answers.siteNorthing !== null &&
		answers.siteNorthing !== undefined;

	if (!hasSiteAddress && !hasSiteCoordinates) {
		missingFields.push('the site address or site coordinates');
	}

	if (!answers.developmentDescription?.trim()) {
		missingFields.push('the application description');
	}

	if (answers.hasApplicationFee !== BOOLEAN_OPTIONS.YES && answers.hasApplicationFee !== BOOLEAN_OPTIONS.NO) {
		missingFields.push('whether the application has a fee');
	} else if (answers.hasApplicationFee === BOOLEAN_OPTIONS.YES && answers.applicationFee === undefined) {
		missingFields.push('the application fee amount');
	}

	if (
		answers.classificationId !== MAJOR_OR_NON_MAJOR_ID.MAJOR &&
		answers.classificationId !== MAJOR_OR_NON_MAJOR_ID.NON_MAJOR
	) {
		missingFields.push('the application classification');
	}

	return missingFields;
}
