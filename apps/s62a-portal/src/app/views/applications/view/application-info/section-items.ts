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
