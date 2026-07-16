import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FIELD_DISPLAY_NAMES } from './questions.ts';

describe('FIELD_DISPLAY_NAMES', () => {
	it('should be an object', () => {
		assert.ok(typeof FIELD_DISPLAY_NAMES === 'object');
		assert.ok(FIELD_DISPLAY_NAMES !== null);
	});

	it('should contain display names for key fields', () => {
		// These should be derived from question definitions
		assert.ok('siteArea' in FIELD_DISPLAY_NAMES, 'should have siteArea');
		assert.ok('lpaReference' in FIELD_DISPLAY_NAMES, 'should have lpaReference');
		assert.ok('description' in FIELD_DISPLAY_NAMES, 'should have description');
	});

	it('should have string values for all keys', () => {
		for (const [key, value] of Object.entries(FIELD_DISPLAY_NAMES)) {
			assert.strictEqual(typeof value, 'string', `${key} should have a string value`);
			assert.ok(value.length > 0, `${key} should not be empty`);
		}
	});

	it('should derive display name from question title', () => {
		// siteArea question has title "Site area (ha)"
		assert.strictEqual(FIELD_DISPLAY_NAMES.siteArea, 'Site area (ha)');
	});

	it('should have lpaReference with correct display name', () => {
		assert.strictEqual(FIELD_DISPLAY_NAMES.lpaReference, 'LPA reference');
	});

	it('should have hearing and inquiry venue fields', () => {
		// These come from eventQuestions('hearing') and eventQuestions('inquiry')
		assert.ok('hearingVenue' in FIELD_DISPLAY_NAMES, 'should have hearingVenue');
		assert.ok('inquiryVenue' in FIELD_DISPLAY_NAMES, 'should have inquiryVenue');
	});
});
