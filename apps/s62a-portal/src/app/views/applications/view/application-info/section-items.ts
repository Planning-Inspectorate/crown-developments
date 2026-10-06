import type { S62aCaseView } from './view-model.ts';

export type SectionItem = {
	key: { text: string };
	value: { html: string } | { text: string };
};

const formattedApplicantNames = (s62aFields: S62aCaseView): SectionItem => {
	return {
		key: {
			text: s62aFields.applicants.length > 1 ? 'Applicants' : 'Applicant'
		},
		value: {
			html: s62aFields.applicants
				.map((applicant) => {
					return `<p class="govuk-body">${applicant}</p>`;
				})
				.join('')
		}
	};
};

/**
 * Gets the top 'About' section that contains basic details
 * about the case
 */
export function getAboutThisApplicationSectionItems(s62aFields: S62aCaseView): SectionItem[] {
	return [
		{
			key: {
				text: 'Application type'
			},
			value: {
				text: s62aFields.applicationType ?? ''
			}
		},
		{
			key: {
				text: 'Local planning authority'
			},
			value: {
				text: s62aFields.lpaName ?? ''
			}
		},
		...(s62aFields.secondaryLpaName
			? [
					{
						key: {
							text: 'Secondary local planning authority'
						},
						value: {
							text: s62aFields.secondaryLpaName
						}
					}
				]
			: []),
		formattedApplicantNames(s62aFields),
		...(s62aFields.siteAddress
			? [
					{
						key: {
							text: 'Site address'
						},
						value: {
							text: s62aFields.siteAddress
						}
					}
				]
			: []),
		...(s62aFields.siteCoordinates?.easting && s62aFields.siteCoordinates.northing
			? [
					{
						key: {
							text: 'Coordinates'
						},
						value: {
							html: `<p class="govuk-body">Easting: ${s62aFields.siteCoordinates?.easting}</p><p class="govuk-body">Northing: ${s62aFields.siteCoordinates?.northing}</p>`
						}
					}
				]
			: []),
		{
			key: {
				text: 'Description of the proposed development'
			},
			value: {
				text: s62aFields.description ?? ''
			}
		},
		{
			key: {
				text: 'Case officer'
			},
			value: {
				text: 'Section 62A Applications Team'
			}
		},
		...(s62aFields.procedure
			? [
					{
						key: {
							text: 'Procedure'
						},
						value: {
							text: s62aFields.procedure
						}
					}
				]
			: [])
	];
}

/**
 * Gets the "Key dates" section of the case
 */
export function getKeyDatesSectionItems(s62aFields: S62aCaseView): SectionItem[] {
	const targetDecision = s62aFields.extendedTargetDecisionDate || s62aFields.targetDecisionDate;

	return [
		{
			key: {
				text: 'Application valid'
			},
			value: {
				text: s62aFields.applicationValidDate ?? ''
			}
		},
		...(s62aFields.representationPeriodStartDateTime && s62aFields.representationPeriodEndDateTime
			? [
					{
						key: {
							text: 'Representation period'
						},
						value: {
							text: `${s62aFields.representationPeriodStartDateTime} to ${s62aFields.representationPeriodEndDateTime}`
						}
					}
				]
			: []),
		...(targetDecision
			? [
					{
						key: {
							text: 'Target decision'
						},
						value: {
							text: targetDecision
						}
					}
				]
			: []),
		...(s62aFields.decisionDate
			? [
					{
						key: {
							text: 'Decision issued'
						},
						value: {
							text: s62aFields.decisionDate
						}
					}
				]
			: []),
		...(s62aFields.withdrawnDate
			? [
					{
						key: {
							text: 'Withdrawn'
						},
						value: {
							text: s62aFields.withdrawnDate
						}
					}
				]
			: [])
	];
}

export function getHearingSectionItems(s62aFields: S62aCaseView): SectionItem[] {
	return [
		...(s62aFields.hearingDate
			? [
					{
						key: {
							text: 'Date'
						},
						value: {
							text: s62aFields.hearingDate
						}
					}
				]
			: []),
		...(s62aFields.hearingVenue
			? [
					{
						key: {
							text: 'Venue'
						},
						value: {
							text: s62aFields.hearingVenue
						}
					}
				]
			: [])
	];
}
