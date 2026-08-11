import { sentenceCase } from '@pins/crowndev-lib/util/string.ts';
import { isDefined } from '@pins/crowndev-lib/util/boolean.ts';

/**
 * Returns applicant organisation options for use in select/radio controls.
 *
 * @param organisations - the list of applicant organisations
 */
export function getApplicantOrganisationOptions(
	organisations: { id?: string; organisationName?: string }[]
): { text: string; value: string }[] {
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
