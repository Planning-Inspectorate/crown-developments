import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validationResult } from 'express-validator';
import type { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import { PrerequisitesValidator } from './prerequisites-validator.ts';

const checks = [
	{ dependencyFieldName: 'venue', isMissing: (v: unknown) => !v, message: 'Add the venue first' },
	{ dependencyFieldName: 'publishDate', isMissing: (v: unknown) => !v, message: 'Publish first' }
];

async function run(answers: Record<string, unknown>, question: Partial<Question> & { bodyFieldNames?: string[] }) {
	const req = { body: {} };
	const chains = new PrerequisitesValidator(checks).validate(
		question as Question,
		{
			answers
		} as unknown as JourneyResponse
	);
	for (const chain of chains) {
		await chain.run(req);
	}
	return validationResult(req).array() as { msg: string; path: string }[];
}

describe('PrerequisitesValidator', () => {
	it('returns one rule per check, so dynamic-forms runs them all', () => {
		const chains = new PrerequisitesValidator(checks).validate({ fieldName: 'hearingDate' } as Question);
		assert.strictEqual(chains.length, 2);
	});

	it('reports every missing item, on the first body field of the question', async () => {
		const errors = await run(
			{},
			{ fieldName: 'hearingDate', bodyFieldNames: ['hearingDate_day', 'hearingDate_month'] }
		);

		assert.deepStrictEqual(
			errors.map(({ msg, path }) => ({ msg, path })),
			[
				{ msg: 'Add the venue first', path: 'hearingDate_day' },
				{ msg: 'Publish first', path: 'hearingDate_day' }
			]
		);
	});

	it('uses the field name when the question has no body field names', async () => {
		const errors = await run({ venue: 'Hall' }, { fieldName: 'decisionDate' });

		assert.deepStrictEqual(
			errors.map(({ msg, path }) => ({ msg, path })),
			[{ msg: 'Publish first', path: 'decisionDate' }]
		);
	});

	it('passes when nothing is missing', async () => {
		const errors = await run({ venue: 'Hall', publishDate: new Date() }, { fieldName: 'hearingDate' });
		assert.deepStrictEqual(errors, []);
	});
});
