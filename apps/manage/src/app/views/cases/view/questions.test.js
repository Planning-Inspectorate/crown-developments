import { describe, it, before } from 'node:test';
import assert from 'node:assert';

describe('FIELD_DISPLAY_NAMES', () => {
	// Set environment before importing modules that depend on it
	before(() => {
		process.env.ENVIRONMENT = 'test';
	});

	it('should be an object', async () => {
		const { FIELD_DISPLAY_NAMES } = await import('./questions.js');
		assert.ok(typeof FIELD_DISPLAY_NAMES === 'object');
		assert.ok(FIELD_DISPLAY_NAMES !== null);
	});

	it('should contain display names for key fields', async () => {
		const { FIELD_DISPLAY_NAMES } = await import('./questions.js');
		// These should be derived from question definitions
		assert.ok('siteArea' in FIELD_DISPLAY_NAMES, 'should have siteArea');
		assert.ok('lpaReference' in FIELD_DISPLAY_NAMES, 'should have lpaReference');
		assert.ok('description' in FIELD_DISPLAY_NAMES, 'should have description');
	});

	it('should have string values for all keys', async () => {
		const { FIELD_DISPLAY_NAMES } = await import('./questions.js');
		for (const [key, value] of Object.entries(FIELD_DISPLAY_NAMES)) {
			assert.strictEqual(typeof value, 'string', `${key} should have a string value`);
			assert.ok(value.length > 0, `${key} should not be empty`);
		}
	});

	it('should derive display name from question title', async () => {
		const { FIELD_DISPLAY_NAMES } = await import('./questions.js');
		// siteArea question has title "Site area (ha)"
		assert.strictEqual(FIELD_DISPLAY_NAMES.siteArea, 'Site area (ha)');
	});

	it('should have lpaReference with correct display name', async () => {
		const { FIELD_DISPLAY_NAMES } = await import('./questions.js');
		assert.strictEqual(FIELD_DISPLAY_NAMES.lpaReference, 'LPA reference');
	});

	it('should have hearing and inquiry venue fields', async () => {
		const { FIELD_DISPLAY_NAMES } = await import('./questions.js');
		// These come from eventQuestions('hearing') and eventQuestions('inquiry')
		assert.ok('hearingVenue' in FIELD_DISPLAY_NAMES, 'should have hearingVenue');
		assert.ok('inquiryVenue' in FIELD_DISPLAY_NAMES, 'should have inquiryVenue');
	});
});
