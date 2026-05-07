import type { CrownDevelopmentView } from '../view-model.ts';

export type SectionItem = {
	key: { text: string };
	value: { html: string } | { text: string };
};
/**
 * Maps applicant names to a format suitable for display in the About this application section, handling both single and multiple organisations.
 */
const formattedOrganisationName = (crownDevelopmentFields: CrownDevelopmentView): SectionItem => {
	// handle historic applicant names prior to multiple entities
	// TODO: CROWN-1424 Remove once ME work is complete and all applications have been migrated to support multiple entities
	if (!crownDevelopmentFields.applicantOrganisations) {
		return {
			key: {
				text: 'Applicant name'
			},
			value: {
				text: crownDevelopmentFields.applicantName ?? ''
			}
		};
	}

	return {
		key: {
			text: crownDevelopmentFields.applicantOrganisations?.length > 1 ? 'Applicant names' : 'Applicant name'
		},
		value: {
			html: crownDevelopmentFields.applicantOrganisations
				.map((applicant) => {
					return `<p class="govuk-body">${applicant}</p>`;
				})
				.join('')
		}
	};
};

/**
 * Maps section items for the 'About this application' section
 */
export function getAboutThisApplicationSectionItems(
	baseUrl: string,
	crownDevelopmentFields: CrownDevelopmentView
): SectionItem[] {
	return [
		{
			key: {
				text: 'Type of application'
			},
			value: {
				text: crownDevelopmentFields.applicationSubType ?? crownDevelopmentFields.applicationType ?? ''
			}
		},
		{
			key: {
				text: crownDevelopmentFields.SecondaryLpa?.name ? 'Local planning authorities' : 'Local planning authority'
			},
			value: crownDevelopmentFields.SecondaryLpa?.name
				? {
						html: `<p class="govuk-body">${crownDevelopmentFields.lpaName}</p> <p class ="govuk-body">${crownDevelopmentFields.SecondaryLpa.name}</p>`
					}
				: {
						text: crownDevelopmentFields.lpaName ?? ''
					}
		},
		formattedOrganisationName(crownDevelopmentFields),
		{
			key: {
				text: 'Site address'
			},
			value: {
				text:
					crownDevelopmentFields.siteAddress ||
					`Easting: ${crownDevelopmentFields.siteCoordinates?.easting}, Northing: ${crownDevelopmentFields.siteCoordinates?.northing}`
			}
		},
		{
			key: {
				text: 'Description of the proposed development'
			},
			value: {
				text: crownDevelopmentFields.description ?? ''
			}
		},
		...(crownDevelopmentFields.stage
			? [
					{
						key: {
							text: 'Stage'
						},
						value: {
							text: crownDevelopmentFields.stage
						}
					}
				]
			: []),
		{
			key: {
				text: 'Application form'
			},
			value: {
				html: `<p class="govuk-body">To view the full application, go to the <a class="govuk-link govuk-link--no-visited-state" href="${baseUrl}/documents">Documents</a> section.</p>`
			}
		}
	];
}

/**
 * Maps section items for the 'Important Dates' section
 */
export function getImportantDatesSectionItems(
	shouldShowImportantDatesSection: boolean,
	crownDevelopmentFields: CrownDevelopmentView
): SectionItem[] | [] {
	if (!shouldShowImportantDatesSection) {
		return [];
	}
	return [
		...(crownDevelopmentFields.applicationAcceptedDate
			? [
					{
						key: {
							text: 'Application accepted date'
						},
						value: {
							text: crownDevelopmentFields.applicationAcceptedDate
						}
					}
				]
			: []),
		...(crownDevelopmentFields.representationsPeriodStartDateTime &&
		crownDevelopmentFields.representationsPeriodEndDateTime
			? [
					{
						key: {
							text: 'Representation period'
						},
						value: {
							text: `${crownDevelopmentFields.representationsPeriodStartDateTime} to ${crownDevelopmentFields.representationsPeriodEndDateTime}`
						}
					}
				]
			: []),
		...(crownDevelopmentFields.decisionDate
			? [
					{
						key: {
							text: 'Decision date'
						},
						value: {
							text: crownDevelopmentFields.decisionDate
						}
					}
				]
			: []),
		...(crownDevelopmentFields.withdrawnDate
			? [
					{
						key: {
							text: 'Withdrawal date'
						},
						value: {
							text: crownDevelopmentFields.withdrawnDate
						}
					}
				]
			: [])
	];
}

/**
 * Maps section items for the 'Procedure details' section, handling both inquiry and hearing procedure types and their relevant fields
 */
export function getProcedureDetailsSectionItems(
	shouldShowProcedureDetailsSection: boolean,
	crownDevelopmentFields: CrownDevelopmentView
): SectionItem[] | [] {
	if (!shouldShowProcedureDetailsSection) {
		return [];
	}

	return [
		{
			key: {
				text: 'Procedure type'
			},
			value: {
				text: crownDevelopmentFields.procedure ?? ''
			}
		},
		...(crownDevelopmentFields.isInquiry && crownDevelopmentFields.inquiryStatementsDate
			? [
					{
						key: {
							text: 'Inquiry statements date'
						},
						value: {
							text: crownDevelopmentFields.inquiryStatementsDate
						}
					}
				]
			: []),
		...(crownDevelopmentFields.isInquiry && crownDevelopmentFields.inquiryDate
			? [
					{
						key: {
							text: 'Inquiry date'
						},
						value: {
							text: crownDevelopmentFields.inquiryDate
						}
					}
				]
			: []),
		...(crownDevelopmentFields.isInquiry && crownDevelopmentFields.inquiryVenue
			? [
					{
						key: {
							text: 'Inquiry venue'
						},
						value: {
							text: crownDevelopmentFields.inquiryVenue
						}
					}
				]
			: []),
		...(crownDevelopmentFields.isInquiry && crownDevelopmentFields.inquiryProofsOfEvidenceDate
			? [
					{
						key: {
							text: 'Inquiry proofs of evidence date'
						},
						value: {
							text: crownDevelopmentFields.inquiryProofsOfEvidenceDate
						}
					}
				]
			: []),
		...(crownDevelopmentFields.isHearing && crownDevelopmentFields.hearingDate
			? [
					{
						key: {
							text: 'Hearing date'
						},
						value: {
							text: crownDevelopmentFields.hearingDate
						}
					}
				]
			: []),
		...(crownDevelopmentFields.isHearing && crownDevelopmentFields.hearingVenue
			? [
					{
						key: {
							text: 'Hearing venue'
						},
						value: {
							text: crownDevelopmentFields.hearingVenue
						}
					}
				]
			: [])
	];
}

/**
 * Maps section items for the 'Application decision' section, showing decision date and outcome if the application has been decided
 */
export function getApplicationDecisionSectionItems(
	shouldShowApplicationDecisionSection: boolean,
	crownDevelopmentFields: CrownDevelopmentView
): SectionItem[] | [] {
	if (!shouldShowApplicationDecisionSection) {
		return [];
	}
	return [
		...(crownDevelopmentFields.decisionDate
			? [
					{
						key: {
							text: 'Decision date'
						},
						value: {
							text: crownDevelopmentFields.decisionDate
						}
					}
				]
			: []),
		...(crownDevelopmentFields.decisionOutcome
			? [
					{
						key: {
							text: 'Decision outcome'
						},
						value: {
							text: crownDevelopmentFields.decisionOutcome
						}
					}
				]
			: [])
	];
}
