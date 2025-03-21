/**
 * @param {{displayName?: string, id: string}[]} reference
 * @param {boolean} [addNullOption]
 * @returns {import('@pins/dynamic-forms/src/questions/question-props.js').Option[]}
 */
export function referenceDataToRadioOptions(reference, addNullOption = false) {
	const options = reference.map((t) => ({ text: t.displayName, value: t.id }));
	if (addNullOption) {
		options.unshift({ text: '', value: '' });
	}
	return options;
}
