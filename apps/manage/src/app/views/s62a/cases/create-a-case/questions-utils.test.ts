import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isApplicationType, formatLpaOptions } from './questions-utils.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

describe('questions.utils', () => {
	describe('isApplicationType', () => {
		it('should return true for a valid PRE_APPLICATION id', () => {
			const result = isApplicationType(PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION);
			assert.strictEqual(result, true);
		});

		it('should return true for a valid APPLICATION id', () => {
			const result = isApplicationType(PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION);
			assert.strictEqual(result, true);
		});

		it('should return false for an unknown string', () => {
			const result = isApplicationType('some-random-string');
			assert.strictEqual(result, false);
		});

		it('should return false for null or undefined', () => {
			assert.strictEqual(isApplicationType(null), false);
			assert.strictEqual(isApplicationType(undefined), false);
		});
	});

	describe('formatLpaOptions', () => {
		it('should prepend an empty option to an empty array', () => {
			const lpas: Prisma.LpaCreateInput[] = [];
			const result = formatLpaOptions(lpas);

			assert.strictEqual(result.length, 1);
			assert.deepStrictEqual(result[0], { text: '', value: '' });
		});

		it('should format a list of LPAs and prepend the empty option', () => {
			const mockLpas = [
				{ id: 'lpa-1', name: 'Westminster City Council' },
				{ id: 'lpa-2', name: 'Camden Council' }
			] as Prisma.LpaCreateInput[];

			const result = formatLpaOptions(mockLpas);

			assert.strictEqual(result.length, 3);

			assert.deepStrictEqual(result[0], { text: '', value: '' });

			assert.deepStrictEqual(result[1], { text: 'Westminster City Council', value: 'lpa-1' });
			assert.deepStrictEqual(result[2], { text: 'Camden Council', value: 'lpa-2' });
		});
	});
});
