import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
	ColumnFormatContext,
	TableColumn
} from '@pins/crowndev-lib/forms/custom-components/manage-list/table/defined-columns-list-table/question.ts';
import {
	additionalContactColumns,
	applicantOrganisationColumns,
	caseTeamInspectorColumns,
	contactColumns
} from './table-columns.ts';

/** Runs a column's format against an item, with a context whose default formatting returns a marker */
function cell(columns: TableColumn[], header: string, item: Record<string, unknown>): string {
	const column = columns.find((col) => col.header === header);
	assert.ok(column, `no ${header} column`);
	assert.ok(column.format, `${header} column has no format`);

	const context = { formatDefault: () => 'DEFAULT' } as unknown as ColumnFormatContext;
	return column.format(item[column.fieldName], item, context);
}

const headers = (columns: TableColumn[]) => columns.map((col) => col.header);

describe('S62A check table columns', () => {
	describe('contactColumns', () => {
		const organisationOptions = [
			{ text: 'Bob and Co LLC', value: 'org-a' },
			{ text: 'Lilac Group', value: 'org-b' }
		];

		it('has Name, Email and Phone number for contacts without an organisation', () => {
			assert.deepStrictEqual(headers(contactColumns('agent')), ['Name', 'Email', 'Phone number']);
		});

		it('adds Applicant organisation when there are organisations', () => {
			assert.deepStrictEqual(headers(contactColumns('applicant', organisationOptions)), [
				'Name',
				'Email',
				'Phone number',
				'Applicant organisation'
			]);
		});

		it('leaves out Applicant organisation when there are none, as for an individual applicant', () => {
			assert.deepStrictEqual(headers(contactColumns('applicant', [])), ['Name', 'Email', 'Phone number']);
		});

		it('joins first and last name', () => {
			const columns = contactColumns('agent');

			assert.strictEqual(cell(columns, 'Name', { agentFirstName: 'Jin', agentLastName: 'Mori' }), 'Jin Mori');
			assert.strictEqual(cell(columns, 'Name', { agentLastName: 'Mori' }), 'Mori');
		});

		it('reads the fields for the given prefix', () => {
			const columns = contactColumns('applicant');
			const item = { applicantContactEmail: 'jin@example.com', applicantContactTelephoneNumber: '0123' };

			assert.strictEqual(cell(columns, 'Email', item), 'jin@example.com');
			assert.strictEqual(cell(columns, 'Phone number', item), '0123');
		});

		it("is empty for a missing value, so the table shows '-'", () => {
			assert.strictEqual(cell(contactColumns('agent'), 'Phone number', {}), '');
		});

		it('shows the organisation name for the contact', () => {
			const columns = contactColumns('applicant', organisationOptions);

			assert.strictEqual(
				cell(columns, 'Applicant organisation', { applicantContactOrganisation: 'org-b' }),
				'Lilac Group'
			);
		});

		it('is empty for an organisation that no longer exists', () => {
			const columns = contactColumns('applicant', organisationOptions);

			assert.strictEqual(cell(columns, 'Applicant organisation', { applicantContactOrganisation: 'org-gone' }), '');
		});

		it('escapes every value', () => {
			const columns = contactColumns('applicant', [{ text: '<i>Org</i>', value: 'org-a' }]);
			const item = {
				applicantFirstName: '<b>Jin</b>',
				applicantContactEmail: 'a&b@example.com',
				applicantContactOrganisation: 'org-a'
			};

			assert.strictEqual(cell(columns, 'Name', item), '&lt;b&gt;Jin&lt;/b&gt;');
			assert.strictEqual(cell(columns, 'Email', item), 'a&amp;b@example.com');
			assert.strictEqual(cell(columns, 'Applicant organisation', item), '&lt;i&gt;Org&lt;/i&gt;');
		});

		it('leaves empty email, phone and organisation out of the tab summary', () => {
			const hidden = contactColumns('applicant', organisationOptions)
				.filter((col) => col.hideInSummaryWhenEmpty)
				.map((col) => col.header);

			assert.deepStrictEqual(hidden, ['Email', 'Phone number', 'Applicant organisation']);
		});
	});

	describe('applicantOrganisationColumns', () => {
		it('has Name and Address', () => {
			assert.deepStrictEqual(headers(applicantOrganisationColumns()), ['Name', 'Address']);
		});

		it('escapes the name', () => {
			assert.strictEqual(cell(applicantOrganisationColumns(), 'Name', { organisationName: 'A & B' }), 'A &amp; B');
		});

		it('leaves the address to its linked question', () => {
			const address = applicantOrganisationColumns().find((col) => col.header === 'Address');

			assert.strictEqual(address?.fieldName, 'organisationAddress');
			assert.strictEqual(address?.format, undefined);
		});
	});

	describe('caseTeamInspectorColumns', () => {
		it('has Name, Date assigned and Date appointed', () => {
			assert.deepStrictEqual(headers(caseTeamInspectorColumns()), ['Name', 'Date assigned', 'Date appointed']);
		});

		it('sorts the dates as dates and labels them in the tab summary', () => {
			const dates = caseTeamInspectorColumns().slice(1);

			assert.deepStrictEqual(
				dates.map((col) => [col.sortType, col.summaryLabel]),
				[
					['date', 'Date assigned'],
					['date', 'Date appointed']
				]
			);
		});
	});

	describe('additionalContactColumns', () => {
		const contactTypeName = (id: string) => (id === 'interested-party' ? 'Interested party' : undefined);
		const columns = additionalContactColumns(contactTypeName);

		it('has Name, Address, Contact and Contact type', () => {
			assert.deepStrictEqual(headers(columns), ['Name', 'Address', 'Contact', 'Contact type']);
		});

		it('bolds the name and puts the organisation beneath it', () => {
			const item = { firstName: 'John', lastName: 'Smith', organisationName: 'Smith Ltd' };

			assert.strictEqual(cell(columns, 'Name', item), '<strong>John Smith</strong><br>Smith Ltd');
		});

		it('shows just the name when there is no organisation', () => {
			assert.strictEqual(
				cell(columns, 'Name', { firstName: 'John', lastName: 'Smith' }),
				'<strong>John Smith</strong>'
			);
		});

		it('puts the phone number beneath the email', () => {
			const item = { emailAddress: 'john@example.com', phoneNumber: '12345678901' };

			assert.strictEqual(cell(columns, 'Contact', item), 'john@example.com<br>12345678901');
		});

		it('shows whichever of email and phone is set', () => {
			assert.strictEqual(cell(columns, 'Contact', { phoneNumber: '0123' }), '0123');
			assert.strictEqual(cell(columns, 'Contact', {}), '');
		});

		it('shows the contact type name', () => {
			assert.strictEqual(
				cell(columns, 'Contact type', { additionalContactType: 'interested-party' }),
				'Interested party'
			);
		});

		it("shows the text entered for an 'other' contact type", () => {
			const item = {
				additionalContactType: 'other',
				// eslint-disable-next-line camelcase -- conditional radio stores answers as `fieldName_conditionalFieldName`
				additionalContactType_otherContactType: 'Local MP'
			};

			assert.strictEqual(cell(columns, 'Contact type', item), 'Local MP');
		});

		it("falls back to otherContactType, then 'Other'", () => {
			assert.strictEqual(
				cell(columns, 'Contact type', { additionalContactType: 'other', otherContactType: 'Parish council' }),
				'Parish council'
			);
			assert.strictEqual(cell(columns, 'Contact type', { additionalContactType: 'other' }), 'Other');
		});

		it('escapes every value', () => {
			const item = {
				firstName: '<b>John</b>',
				organisationName: 'A & B',
				emailAddress: '<x>',
				additionalContactType: 'other',
				otherContactType: '<i>MP</i>'
			};

			assert.strictEqual(cell(columns, 'Name', item), '<strong>&lt;b&gt;John&lt;/b&gt;</strong><br>A &amp; B');
			assert.strictEqual(cell(columns, 'Contact', item), '&lt;x&gt;');
			assert.strictEqual(cell(columns, 'Contact type', item), '&lt;i&gt;MP&lt;/i&gt;');
		});
	});
});
