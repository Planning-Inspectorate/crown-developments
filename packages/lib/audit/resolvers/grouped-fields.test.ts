import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGroupedFieldChanges, type GroupedFieldRegistry } from './grouped-fields.ts';
import { joinParts, toNumberText, toText } from './util/values.ts';

const groups: GroupedFieldRegistry = {
	coordinates: {
		parts: ['x', 'y'],
		format: (values) => joinParts([toNumberText(values.x), toNumberText(values.y)])
	},
	contact: {
		parts: ['name', 'email'],
		format: (values) => joinParts([toText(values.name), toText(values.email)])
	}
};

describe('resolveGroupedFieldChanges', () => {
	it('should return one change for the question, not one per input', () => {
		const changes = resolveGroupedFieldChanges(groups, ['x', 'y'], { x: 1, y: 2 }, { x: '3', y: '2' });

		assert.deepStrictEqual(changes, [{ fieldName: 'coordinates', oldValue: '1, 2', newValue: '3, 2' }]);
	});

	it('should return nothing when the formatted values are the same', () => {
		assert.deepStrictEqual(resolveGroupedFieldChanges(groups, ['x', 'y'], { x: 1, y: 2 }, { x: '1', y: '2' }), []);
	});

	it('should keep the old value for parts that were not sent', () => {
		const changes = resolveGroupedFieldChanges(
			groups,
			['email'],
			{ name: 'Test User One', email: 'one@example.com' },
			{ email: 'two@example.com' }
		);

		assert.deepStrictEqual(changes, [
			{
				fieldName: 'contact',
				oldValue: 'Test User One, one@example.com',
				newValue: 'Test User One, two@example.com'
			}
		]);
	});

	it('should show a cleared group as "-"', () => {
		const changes = resolveGroupedFieldChanges(groups, ['x', 'y'], { x: 1, y: 2 }, { x: null, y: null });

		assert.deepStrictEqual(changes, [{ fieldName: 'coordinates', oldValue: '1, 2', newValue: '-' }]);
	});

	it('should ignore saves that do not touch a group', () => {
		assert.deepStrictEqual(resolveGroupedFieldChanges(groups, ['somethingElse'], {}, { somethingElse: 'x' }), []);
	});
});
