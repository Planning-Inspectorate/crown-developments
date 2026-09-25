import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate } from '@pins/crowndev-lib/audit/shared-actions.ts';
import { S62A_AUDIT_ACTIONS, S62A_AUDIT_TEMPLATES, type S62aAuditAction } from './actions.ts';

function resolve(action: S62aAuditAction, metadata: Record<string, unknown>) {
	return fillTemplate(S62A_AUDIT_TEMPLATES[action], metadata);
}

describe('S62A audit templates', () => {
	it('should match the scenarios sheet for applicant contacts', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_ADDED, { name: 'Test User One' }),
			'Test User One was added to applicant contact(s).'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_UPDATED, {
				entityName: 'Test User One',
				fieldName: 'name',
				oldValue: 'Test User One',
				newValue: 'Test User Two'
			}),
			'Applicant contact (Test User One) name was updated from "Test User One" to "Test User Two"'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED, { name: 'Test User One' }),
			'Test User One was deleted from applicant contact(s).'
		);
	});

	it('should match the scenarios sheet for applicant organisations', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.APPLICANT_ORGANISATION_UPDATED, {
				entityName: 'Test Organisation',
				fieldName: 'name',
				oldValue: 'Test Organisation',
				newValue: 'Test Organisation Ltd'
			}),
			'Organisation (Test Organisation) name was updated from "Test Organisation" to "Test Organisation Ltd"'
		);
	});

	it('should match the scenarios sheet for agent contacts', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.AGENT_CONTACT_ADDED, { name: 'Test User One' }),
			'Test User One was added to agent contact(s).'
		);
	});

	it('should match the scenarios sheet for inspectors', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.INSPECTOR_UPDATED, {
				entityName: 'Test User One',
				fieldName: 'date appointed',
				oldValue: '10 October 2025',
				newValue: '10 October 2026'
			}),
			'Inspector (Test User One) date appointed was updated from "10 October 2025" to "10 October 2026"'
		);
	});

	it('should match the scenarios sheet for additional contacts', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_UPDATED, {
				entityName: 'Test User One',
				fieldName: 'contact type',
				oldValue: 'Other: acquiring authority',
				newValue: 'Interested party'
			}),
			'Contact (Test User One) contact type was updated from "Other: acquiring authority" to "Interested party"'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.ADDITIONAL_CONTACT_DELETED, { name: 'Test User One' }),
			'Test User One was deleted from additional contact(s).'
		);
	});

	it('should match the scenarios sheet for vehicle parking', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.VEHICLE_PARKING_ADDED, { name: 'Cars' }),
			'Parking for Cars was added to vehicle parking.'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.VEHICLE_PARKING_UPDATED, {
				entityName: 'Cars',
				fieldName: 'Existing spaces',
				oldValue: '100',
				newValue: '10'
			}),
			'Parking for (Cars) Existing spaces was updated from "100" to "10"'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.VEHICLE_PARKING_DELETED, { name: 'Cars' }),
			'Parking for Cars was deleted from vehicle parking.'
		);
	});

	it('should match the scenarios sheet for types of waste', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.WASTE_TYPE_ADDED, { name: 'Inert landfill' }),
			'Inert landfill was added to types of waste.'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.WASTE_TYPE_UPDATED, {
				entityName: 'Inert landfill',
				fieldName: 'capacity',
				oldValue: '1m³',
				newValue: '100t'
			}),
			'Inert landfill capacity was updated from "1m³" to "100t"'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.WASTE_TYPE_DELETED, { name: 'Inert landfill' }),
			'Inert landfill was deleted from types of waste.'
		);
	});

	it('should match the scenarios sheet for existing and proposed housing', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.EXISTING_HOUSING_ADDED, { name: 'Market housing - Houses' }),
			'Market housing - Houses was added to existing housing.'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.EXISTING_HOUSING_UPDATED, {
				entityName: 'Market housing - Houses',
				fieldName: 'type of unit',
				oldValue: 'Houses',
				newValue: 'Cluster flats'
			}),
			'Market housing - Houses type of unit was updated from "Houses" to "Cluster flats" in existing housing'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_UPDATED, {
				entityName: 'Market housing - Houses',
				fieldName: 'number of bedroom units',
				oldValue: '1 bedroom: 10, 3 bedrooms: 6',
				newValue: '3 bedrooms: 4'
			}),
			'Market housing - Houses number of bedroom units was updated from "1 bedroom: 10, 3 bedrooms: 6" to "3 bedrooms: 4" in proposed housing'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.PROPOSED_HOUSING_DELETED, { name: 'Market housing - Houses' }),
			'Market housing - Houses was deleted from proposed housing.'
		);
	});

	it('should match the scenarios sheet for non-residential floorspace', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_ADDED, { name: 'C1: Hotels' }),
			'C1: Hotels was added to non-residential floorspace details.'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_UPDATED, {
				entityName: 'C1: Hotels',
				fieldName: 'type of use',
				oldValue: 'C1: Hotels',
				newValue: 'C2: Residential institutions'
			}),
			'C1: Hotels type of use was updated from "C1: Hotels" to "C2: Residential institutions"'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_LIST_UPDATED, {
				entityName: 'C1: Hotels',
				fieldName: 'floorspace details',
				oldValue: '- Existing gross internal floorspace: 1m²',
				newValue: '- Existing gross internal floorspace: 10m²'
			}),
			'C1: Hotels floorspace details was updated from:\n- Existing gross internal floorspace: 1m²\n\nto\n- Existing gross internal floorspace: 10m²'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.NON_RESIDENTIAL_FLOORSPACE_DELETED, { name: 'C1: Hotels' }),
			'C1: Hotels was deleted from non-residential floorspace details.'
		);
	});

	it('should put quotes around updated values', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.FIELD_UPDATED, {
				fieldName: 'LPA reference',
				oldValue: 'ABC/123',
				newValue: 'DEF/345'
			}),
			'LPA reference was updated from "ABC/123" to "DEF/345"'
		);
	});

	it('should not put quotes around set or removed values', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.FIELD_SET, { fieldName: 'Specialism', newValue: 'Tree preservation order' }),
			'Specialism was set to Tree preservation order'
		);
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.FIELD_CLEARED, { fieldName: 'Specialism', oldValue: 'Tree preservation order' }),
			'Specialism (Tree preservation order) was removed'
		);
	});

	it('should include the shared templates', () => {
		assert.strictEqual(
			resolve(S62A_AUDIT_ACTIONS.FIELD_SET, { fieldName: 'Specialism', newValue: 'Tree preservation order' }),
			'Specialism was set to Tree preservation order'
		);
	});
});
