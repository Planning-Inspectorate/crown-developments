import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCachedAjv } from './cached-ajv.ts';

const SCHEMA_ID = 'applications-application-update.schema.json';

const validUpdate = () => ({
	id: 'AAAAAAAA-1234-1234-1234-AAAAAAAAAAAA',
	caseReference: 'CROWN/2025/12345',
	caseId: 'BBBBBBBB-1234-1234-1234-BBBBBBBBBBBB',
	caseType: 'Crown Development',
	applicationUpdateStatus: 'Published',
	details: 'Some update',
	firstPublished: '2026-11-17T10:00:00.000Z',
	unpublishedDate: null,
	lastEdited: '2026-11-17T10:00:00.000Z'
});

async function getValidator() {
	const validate = (await getCachedAjv()).getSchema(SCHEMA_ID);
	assert.ok(validate, `${SCHEMA_ID} not registered`);
	return validate;
}

describe('getCachedAjv', () => {
	it('should return the same instance on repeated calls', async () => {
		const [a, b] = await Promise.all([getCachedAjv(), getCachedAjv()]);
		console.log(a);
		assert.strictEqual(a, b);
		assert.strictEqual(await getCachedAjv(), a);
	});

	it('should register the crown dev schemas by $id', async () => {
		const ajv = await getCachedAjv();
		assert.ok(ajv.getSchema('applications-application-update.schema.json'));
		assert.ok(ajv.getSchema('applications-crowndev-application.schema.json'));
	});

	it('should accept a valid application update', async () => {
		const validate = await getValidator();
		assert.strictEqual(validate(validUpdate()), true, JSON.stringify(validate.errors));
	});

	it('should reject a missing required field', async () => {
		const validate = await getValidator();
		const { details: _details, ...withoutDetails } = validUpdate();
		assert.strictEqual(validate(withoutDetails), false);
		assert.ok(validate.errors?.some((e) => e.keyword === 'required' && e.params.missingProperty === 'details'));
	});

	it('should reject a wrong type', async () => {
		const validate = await getValidator();
		assert.strictEqual(validate({ ...validUpdate(), caseId: 123 }), false);
		assert.ok(validate.errors?.some((e) => e.keyword === 'type' && e.instancePath === '/caseId'));
	});

	it('should reject a status outside the enum', async () => {
		const validate = await getValidator();
		assert.strictEqual(validate({ ...validUpdate(), applicationUpdateStatus: 'Archived' }), false);
		assert.ok(validate.errors?.some((e) => e.keyword === 'enum'));
	});
});
