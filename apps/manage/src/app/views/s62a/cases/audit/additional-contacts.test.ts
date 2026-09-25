import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_ROLES, CONTACT_ROLES_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	getAdditionalContactName,
	getAdditionalContactType,
	resolveAdditionalContactAudits
} from './additional-contacts.ts';
import { S62A_AUDIT_ACTIONS } from './actions.ts';
import { S62A_LIST_RESOLVERS } from './list-resolvers.ts';

const CASE_ID = 'case-1';
const USER_ID = 'user-1';

const INTERESTED_PARTY = CONTACT_ROLES.find((role) => role.id === CONTACT_ROLES_ID.INTERESTED_PARTY);

function additionalContact(overrides: Record<string, unknown> = {}) {
	return {
		id: 'contact-1',
		additionalContactType: CONTACT_ROLES_ID.INTERESTED_PARTY,
		firstName: 'Test',
		lastName: 'User One',
		organisationName: 'Test Organisation',
		additionalContactAddress: { addressLine1: '1 Test Street', townCity: 'Test Town', postcode: 'TE1 1ST' },
		emailAddress: 'one@example.com',
		phoneNumber: '01234567890',
		...overrides
	};
}

describe('getAdditionalContactName', () => {
	it('should join first and last name', () => {
		assert.strictEqual(getAdditionalContactName(additionalContact()), 'Test User One');
	});

	it('should fall back to the organisation name', () => {
		assert.strictEqual(
			getAdditionalContactName(additionalContact({ firstName: '', lastName: undefined })),
			'Test Organisation'
		);
	});

	it('should return "-" if there is no name or organisation', () => {
		assert.strictEqual(getAdditionalContactName({}), '-');
	});
});

describe('getAdditionalContactType', () => {
	it('should resolve the contact role to its display name', () => {
		assert.strictEqual(getAdditionalContactType(additionalContact()), INTERESTED_PARTY?.displayName);
	});

	it('should include the text for Other', () => {
		assert.strictEqual(
			getAdditionalContactType({ additionalContactType: 'other', otherContactType: 'acquiring authority' }),
			'Other: acquiring authority'
		);
	});

	it('should read the Other text from the nested key too', () => {
		assert.strictEqual(
			getAdditionalContactType({
				additionalContactType: 'other',
				additionalContactType_otherContactType: 'acquiring authority'
			}),
			'Other: acquiring authority'
		);
	});

	it('should return "-" if no type is set', () => {
		assert.strictEqual(getAdditionalContactType({}), '-');
	});
});

describe('resolveAdditionalContactAudits', () => {
	it('should record a contact being added', () => {
		const entries = resolveAdditionalContactAudits(CASE_ID, USER_ID, [], [additionalContact()]);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_ADDED,
				metadata: { name: 'Test User One' }
			}
		]);
	});

	it('should record a contact being deleted', () => {
		const entries = resolveAdditionalContactAudits(CASE_ID, USER_ID, [additionalContact()], []);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_DELETED,
				metadata: { name: 'Test User One' }
			}
		]);
	});

	it('should record nothing when a contact is unchanged', () => {
		const entries = resolveAdditionalContactAudits(CASE_ID, USER_ID, [additionalContact()], [additionalContact()]);

		assert.deepStrictEqual(entries, []);
	});

	it('should record a contact type change from Other to a listed role', () => {
		const entries = resolveAdditionalContactAudits(
			CASE_ID,
			USER_ID,
			[additionalContact({ additionalContactType: 'other', otherContactType: 'acquiring authority' })],
			[additionalContact()]
		);

		assert.deepStrictEqual(entries[0].metadata, {
			entityName: 'Test User One',
			fieldName: 'contact type',
			oldValue: 'Other: acquiring authority',
			newValue: INTERESTED_PARTY?.displayName
		});
	});

	it('should record a name change as one entry, using the original name', () => {
		const entries = resolveAdditionalContactAudits(
			CASE_ID,
			USER_ID,
			[additionalContact()],
			[additionalContact({ lastName: 'User Two' })]
		);

		assert.deepStrictEqual(entries, [
			{
				caseId: CASE_ID,
				userId: USER_ID,
				action: S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_UPDATED,
				metadata: {
					entityName: 'Test User One',
					fieldName: 'name',
					oldValue: 'Test User One',
					newValue: 'Test User Two'
				}
			}
		]);
	});

	it('should record organisation, address, email and phone number changes separately', () => {
		const entries = resolveAdditionalContactAudits(
			CASE_ID,
			USER_ID,
			[additionalContact()],
			[
				additionalContact({
					organisationName: 'Another Test Organisation',
					additionalContactAddress: { addressLine1: '2 Test Road', townCity: 'Test City', postcode: 'TE2 2ST' },
					emailAddress: 'new@example.com',
					phoneNumber: ''
				})
			]
		);

		assert.deepStrictEqual(
			entries.map((entry) => entry.metadata?.fieldName),
			['organisation name', 'address', 'email', 'phone number']
		);
		assert.deepStrictEqual(entries[1].metadata, {
			entityName: 'Test User One',
			fieldName: 'address',
			oldValue: '1 Test Street, Test Town, TE1 1ST',
			newValue: '2 Test Road, Test City, TE2 2ST'
		});
		assert.strictEqual(entries[3].metadata?.newValue, '-');
	});
});

describe('S62A_LIST_RESOLVERS additional contacts', () => {
	it('should be registered against the additional contacts list', () => {
		const entries = S62A_LIST_RESOLVERS.manageAdditionalContacts.resolve({
			caseId: CASE_ID,
			userId: USER_ID,
			oldItems: [additionalContact()],
			newItems: [],
			previousCase: {},
			answers: {}
		});

		assert.strictEqual(entries[0].action, S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_DELETED);
	});
});
