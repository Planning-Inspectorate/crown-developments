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

/**
 * @param {string} inputString
 * @returns {string} inputString converted to kebab-case (e.g. input-string)
 */
export function toKebabCase(inputString) {
	return inputString
		.replace(/\s+/g, '-')
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.toLowerCase();
}
