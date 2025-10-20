export function getAboutThisApplicationSectionItems(baseUrl, crownDevelopmentFields) {
	return [
		{
			key: {
				text: 'Type of application'
			},
			value: {
				text: crownDevelopmentFields.applicationType
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
						text: crownDevelopmentFields.lpaName
					}
		},
		{
			key: {
				text: 'Applicant name'
			},
			value: {
				text: crownDevelopmentFields.applicantName
			}
		},
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
				text: crownDevelopmentFields.description
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

export function getImportantDatesSectionItems(shouldShowImportantDatesSection, crownDevelopmentFields) {
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
			: [])
	];
}

export function getProcedureDetailsSectionItems(shouldShowProcedureDetailsSection, crownDevelopmentFields) {
	if (!shouldShowProcedureDetailsSection) {
		return [];
	}

	return [
		{
			key: {
				text: 'Procedure type'
			},
			value: {
				text: crownDevelopmentFields.procedure
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

export function getApplicationDecisionSectionItems(shouldShowApplicationDecisionSection, crownDevelopmentFields) {
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
