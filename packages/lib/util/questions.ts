import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { Option } from '@planning-inspectorate/dynamic-forms';

const MAX_LENGTH = 500;

type Reference = {
	id: string;
	displayName: string;
};

type ReferenceWithHint = Reference & { hintText: string };

/**
 * Converts an array of reference data into radio options for a form.
 */
export function referenceDataToRadioOptions(reference: Reference[], addNullOption: boolean = false): Option[] {
	const options = reference.map((t) => ({ text: t.displayName, value: t.id }));
	if (addNullOption) {
		options.unshift({ text: '', value: '' });
	}
	return options;
}

/**
 * Converts an array of reference data with hint text into radio options for a form, including hint text for each option.
 */
export function referenceDataToRadioOptionsWithHintText(
	reference: ReferenceWithHint[],
	addNullOption: boolean = false
): Option[] {
	const options = reference.map((t) => ({
		text: t.displayName,
		value: t.id,
		hint: { text: t.hintText }
	}));
	if (addNullOption) {
		options.unshift({ text: '', value: '', hint: { text: '' } });
	}
	return options;
}

/**
 * Determines the submittedForId based on the answers provided.
 * Defaults to ON_BEHALF_OF.
 */
export function getSubmittedForId(answers: Record<string, unknown>): string {
	return answers['submittedForId'] === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		? REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
		: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF;
}

/**
 * Checks if a comment should be truncated based on its length.
 */
export function shouldTruncateComment(comment: string): boolean {
	return comment.length > MAX_LENGTH;
}

/**
 * Truncates a comment if it exceeds the maximum length and appends an ellipsis.
 */
export function truncateComment(comment: string): string {
	if (shouldTruncateComment(comment)) {
		const truncated = comment.substring(0, MAX_LENGTH);
		return `${truncated}... `;
	}
	return comment;
}

/**
 * Generates a "Read more" link for a truncated comment, directing users to the full comment.
 */
export function truncatedReadMoreCommentLink(href: string): string {
	return `<a class="govuk-link govuk-link--no-visited-state" href="${href}">Read more</a>`;
}
