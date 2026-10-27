import type { TableColumn } from '@pins/crowndev-lib/forms/custom-components/manage-list/table/defined-columns-list-table/question.ts';
import { escapedFullName, escapeHtml, escapeHtmlOrEmpty } from '@pins/crowndev-lib/util/string.ts';
import { toText } from '@pins/crowndev-lib/audit/resolvers/util/values.ts';

/**
 * Column definitions for the check details tables, shared by the
 * Create a case and view case journeys so both show the same table.
 */

type Item = Record<string, unknown>;

/** A single escaped field, or '' */
function textColumnFormat(fieldName: string) {
	return (_value: unknown, item: Item) => escapeHtmlOrEmpty(item[fieldName]);
}

/**
 * Name, Email and Phone number for an applicant or agent contact, plus
 * Applicant organisation when the contacts belong to organisations.
 */
export function contactColumns(
	prefix: string,
	organisationOptions: Array<{ text: string; value: string }> | null = null
): TableColumn[] {
	const columns: TableColumn[] = [
		{
			header: 'Name',
			fieldName: `${prefix}FirstName`,
			format: (_value, item) => escapedFullName(item[`${prefix}FirstName`], item[`${prefix}LastName`])
		},
		{
			header: 'Email',
			fieldName: `${prefix}ContactEmail`,
			format: textColumnFormat(`${prefix}ContactEmail`),
			hideInSummaryWhenEmpty: true
		},
		{
			header: 'Phone number',
			fieldName: `${prefix}ContactTelephoneNumber`,
			format: textColumnFormat(`${prefix}ContactTelephoneNumber`),
			hideInSummaryWhenEmpty: true
		}
	];

	if (organisationOptions?.length) {
		const fieldName = `${prefix}ContactOrganisation`;
		columns.push({
			header: 'Applicant organisation',
			fieldName,
			format: (_value, item) => {
				const id = toText(item[fieldName]);
				const name = organisationOptions.find((option) => option.value === id)?.text ?? '';
				return escapeHtml(name);
			},
			hideInSummaryWhenEmpty: true
		});
	}

	return columns;
}

/** Name and Address for an applicant organisation */
export function applicantOrganisationColumns(): TableColumn[] {
	return [
		{
			header: 'Name',
			fieldName: 'organisationName',
			format: textColumnFormat('organisationName')
		},
		{
			header: 'Address',
			// Formatted by the linked address question
			fieldName: 'organisationAddress',
			hideInSummaryWhenEmpty: true
		}
	];
}

/**
 * Name, Date assigned and Date appointed for an appointed person/inspector.
 * The name and dates are formatted by their linked sub-questions.
 */
export function caseTeamInspectorColumns(): TableColumn[] {
	return [
		{ header: 'Name', fieldName: 'inspectorId' },
		{ header: 'Date assigned', fieldName: 'inspectorAssignedDate', sortType: 'date', summaryLabel: 'Date assigned' },
		{ header: 'Date appointed', fieldName: 'inspectorAppointedDate', sortType: 'date', summaryLabel: 'Date appointed' }
	];
}

/**
 * Name (with organisation beneath), Address, Contact (email and phone) and
 * Contact type for an additional contact.
 */
export function additionalContactColumns(contactTypeName: (id: string) => string | undefined): TableColumn[] {
	return [
		{
			header: 'Name',
			fieldName: 'firstName',
			format: (_value, item) => {
				const name = escapedFullName(item.firstName, item.lastName);
				const organisation = escapeHtmlOrEmpty(item.organisationName);
				const nameHtml = name ? `<strong>${name}</strong>` : '';
				return [nameHtml, organisation].filter(Boolean).join('<br>');
			}
		},
		{
			header: 'Address',
			// Formatted by the linked address question
			fieldName: 'additionalContactAddress'
		},
		{
			header: 'Contact',
			fieldName: 'emailAddress',
			format: (_value, item) =>
				[escapeHtmlOrEmpty(item.emailAddress), escapeHtmlOrEmpty(item.phoneNumber)].filter(Boolean).join('<br>')
		},
		{
			header: 'Contact type',
			fieldName: 'additionalContactType',
			format: (_value, item) => {
				const type = toText(item.additionalContactType);
				if (type === 'other') {
					// Conditional radios store the reveal under fieldName_conditionalFieldName
					const other = toText(item.additionalContactType_otherContactType) ?? toText(item.otherContactType);
					return escapeHtml(other || 'Other');
				}
				return escapeHtml((type && contactTypeName(type)) || '');
			}
		}
	];
}
