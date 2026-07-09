import { describe, it } from 'node:test';
import assert from 'node:assert';
import { S62aCaseUpdateMapper, type UpdateCaseAnswers } from './s62a-update-case-mapper.ts';

describe('S62aCaseUpdateMapper', () => {
	describe('Empty and Undefined Payloads', () => {
		it('returns an empty object if no fields are provided', () => {
			const answers: UpdateCaseAnswers = {};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result, {}, 'Should return a completely empty object');
		});

		it('ignores explicitly undefined fields', () => {
			const answers: UpdateCaseAnswers = {
				developmentDescription: undefined,
				s62aStatusId: undefined
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result, {}, 'Should not map fields that are undefined');
		});
	});

	describe('Scalar Mapping', () => {
		it('maps developmentDescription when provided', () => {
			const answers: UpdateCaseAnswers = {
				developmentDescription: 'This is an updated description'
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.description, 'This is an updated description');
			assert.strictEqual(result.S62aStatus, undefined, 'Should not map unprovided lookup fields');
		});

		it('allows clearing the developmentDescription with an empty string', () => {
			const answers: UpdateCaseAnswers = {
				developmentDescription: ''
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.strictEqual(result.description, '');
		});
	});

	describe('Lookup Mapping', () => {
		it('maps s62aStatusId into a Prisma connect object', () => {
			const answers: UpdateCaseAnswers = {
				s62aStatusId: 'valid-status-id'
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result.S62aStatus, { connect: { id: 'valid-status-id' } });
			assert.strictEqual(result.description, undefined, 'Should not map unprovided scalar fields');
		});
	});

	describe('Combined Mapping', () => {
		it('maps multiple fields correctly simultaneously', () => {
			const answers: UpdateCaseAnswers = {
				developmentDescription: 'A newly updated case',
				s62aStatusId: 'status-123'
			};
			const mapper = new S62aCaseUpdateMapper(answers);

			const result = mapper.generateUpdateInput();

			assert.deepStrictEqual(result, {
				description: 'A newly updated case',
				S62aStatus: { connect: { id: 'status-123' } }
			});
		});
	});
});
