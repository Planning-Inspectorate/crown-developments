import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @param {{displayName?: string, id: string}[]} reference
 * @param {boolean} [addNullOption]
 * @returns {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').Option[]}
 */
export function referenceDataToRadioOptions(reference, addNullOption = false) {
	const options = reference.map((t) => ({ text: t.displayName, value: t.id }));
	if (addNullOption) {
		options.unshift({ text: '', value: '' });
	}
	return options;
}

/**
 * @param {{displayName?: string, id: string, hintText: string|undefined}[]} reference
 * @param {boolean} [addNullOption]
 * @returns {import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').Option[]}
 */
export function referenceDataToRadioOptionsWithHintText(reference, addNullOption = false) {
	const options = reference.map((t) => ({ text: t.displayName, value: t.id, hint: { text: t.hintText } }));
	if (addNullOption) {
		options.unshift({ text: '', value: '', hint: { text: '' } });
	}
	return options;
}

export function getSubmittedForId(answers) {
	return answers['submittedForId'] === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		? REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF;
}
