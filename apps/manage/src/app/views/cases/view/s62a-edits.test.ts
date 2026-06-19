import { describe, it } from 'node:test';
import assert from 'node:assert';
import { editsToDatabaseUpdates } from './view-model.ts';
import { s62aEditsToDatabaseUpdates } from './s62a-edits.ts';
import type { CrownDevelopmentSaveModel, CrownDevelopmentViewModel } from './view-model.ts';

// These tests don't depend on any view-model fields, so an empty fixture is a correct cast to
// satisfy the parameter type without spelling out unused required fields.
const emptyViewModel = {} as CrownDevelopmentViewModel;

describe('s62a-edits', () => {
	describe('s62aEditsToDatabaseUpdates', () => {
		it('applies shared fields for S62A too', () => {
			const edits: CrownDevelopmentSaveModel = {
				description: 'An S62A application',
				typeId: 'type-1',
				lpaId: 'lpa-1'
			};
			const result = editsToDatabaseUpdates(edits, emptyViewModel, s62aEditsToDatabaseUpdates);

			assert.strictEqual(result.description, 'An S62A application');
			assert.deepStrictEqual(result.Type, { connect: { id: 'type-1' } });
			assert.deepStrictEqual(result.Lpa, { connect: { id: 'lpa-1' } });
		});

		it('does not apply Crown-only fields for S62A', () => {
			const edits: CrownDevelopmentSaveModel = { statusId: 'stat-1' };
			const result = editsToDatabaseUpdates(edits, emptyViewModel, s62aEditsToDatabaseUpdates);

			assert.strictEqual(result.Status, undefined);
		});

		it('maps the S62A application classification (placeholder)', () => {
			const edits: CrownDevelopmentSaveModel = { applicationClassificationId: 'major' };
			const result = editsToDatabaseUpdates(edits, emptyViewModel, s62aEditsToDatabaseUpdates);

			assert.deepStrictEqual((result as Record<string, unknown>).ApplicationClassification, {
				connect: { id: 'major' }
			});
		});
	});
});
