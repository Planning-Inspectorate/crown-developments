import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.ts';
import type { Option } from '@planning-inspectorate/dynamic-forms';

export const CASE_NOTE_MAX_LENGTH = 100;

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
export function shouldTruncateComment(comment: string, maxLength: number): boolean {
	return comment.length > maxLength;
}

/**
 * Truncates a comment if it exceeds the maximum length and appends an ellipsis.
 */
export function truncateComment(comment: string, maxLength: number): string {
	if (shouldTruncateComment(comment, maxLength)) {
		const truncated = comment.substring(0, maxLength);
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

/**
 * Environment names for LPA selection
 */
const ENVIRONMENT_NAME = {
	PROD: 'prod'
} as const;

/**
 * Get LPA options for radio/select fields.
 * Deferred evaluation of environment from process.env.ENVIRONMENT to avoid issues at module load time (e.g., in tests).
 * Falls back to DEV data if environment is not set or not 'prod'.
 * @returns Array of LPA options with empty first option, sorted alphabetically
 */
export function getLpaOptions(): Option[] {
	let LPAs: typeof LOCAL_PLANNING_AUTHORITIES_DEV;
	try {
		const env = process.env.ENVIRONMENT;
		// this is to avoid a database read when the data is static - but it does vary by environment
		// the options here should match the dev/prod seed scripts
		LPAs = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;
	} catch {
		// Fallback to dev data if there's an issue, to ensure the app can still function.
		// This would likely only be triggered by tests.
		LPAs = LOCAL_PLANNING_AUTHORITIES_DEV;
	}
	return [
		{ text: '', value: '' }, // ensure there is a 'null' option so the first LPA isn't selected by default
		...LPAs.map((t) => ({ text: t.name ?? '', value: t.id ?? '' })).sort((a, b) => a.text.localeCompare(b.text))
	];
}
