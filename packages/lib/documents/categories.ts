/**
 * Document category definitions shared across the application.
 * Each category has a SharePoint display name and a normalized camelCase value.
 */

export interface CategoryDefinition {
	sharepointName: string;
	displayName: string;
	value: string;
	alwaysShow?: boolean;
}

/**
 * Complete list of all document categories in the system.
 *
 * Categories marked with alwaysShow: true will appear in filters
 */
export const DOCUMENT_CATEGORIES: ReadonlyArray<Readonly<CategoryDefinition>> = Object.freeze([
	Object.freeze({ sharepointName: 'Application', displayName: 'Application', value: 'application', alwaysShow: true }),
	Object.freeze({
		sharepointName: 'LPA Questionnaire',
		displayName: 'LPA questionnaire',
		value: 'lpaQuestionnaire',
		alwaysShow: true
	}),
	Object.freeze({
		sharepointName: 'Written Representation',
		displayName: 'Written Representations',
		value: 'writtenRepresentations',
		alwaysShow: false
	}),
	Object.freeze({ sharepointName: 'Inquiry', displayName: 'Inquiry', value: 'inquiry', alwaysShow: false }),
	Object.freeze({ sharepointName: 'Hearing', displayName: 'Hearing', value: 'hearing', alwaysShow: false }),
	Object.freeze({ sharepointName: 'Decision', displayName: 'Decision', value: 'decision', alwaysShow: true })
]);

/**
 * Mapping from SharePoint display names to normalized camelCase values
 */
export const CATEGORY_SHAREPOINT_TO_VALUE: Readonly<Record<string, string>> = Object.freeze(
	Object.fromEntries(DOCUMENT_CATEGORIES.map((cat) => [cat.sharepointName, cat.value]))
);

/**
 * Mapping from normalized camelCase values to SharePoint display names
 */
export const CATEGORY_VALUE_TO_SHAREPOINT: Readonly<Record<string, string>> = Object.freeze(
	Object.fromEntries(DOCUMENT_CATEGORIES.map((cat) => [cat.value, cat.sharepointName]))
);
