import { sentenceCase } from '@pins/crowndev-lib/util/string.js';
import { isDefined } from '@pins/crowndev-lib/util/boolean.js';

/**
 * Returns applicant organisation options for use in select/radio controls.
 * @param {Array<{id?: string, organisationName?: string}>} organisations
 * @returns {Array<{text: string, value: string}>}
 */
export function getApplicantOrganisationOptions(organisations) {
	if (!Array.isArray(organisations) || organisations.length === 0) return [];
	return organisations
		.map((answer) => {
			const name = answer?.organisationName || '';
			const id = answer?.id;
			if (!name || !id) return null;
			return { text: sentenceCase(name), value: id };
		})
		.filter(isDefined);
}
