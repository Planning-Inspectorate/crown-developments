import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDate, isInquiry, isHearing, mapDevelopmentToViewModel } from './shared-view-model.ts';
import type { GenericDevelopmentView, MinimumDevelopmentRequirements } from './shared-view-model.ts';

const MOCK_INQUIRY_ID = 'inquiry';
const MOCK_HEARING_ID = 'hearing';

describe('Application Utilities', () => {
	describe('formatDate', () => {
		void it('should pass the Date object and options through to the underlying formatter', () => {
			const testDate = new Date('2026-06-12');
			const options = { format: 'dd/MM/yyyy' };

			const result = formatDate(testDate, options);
			assert.strictEqual(typeof result, 'string');
		});

		it('should handle null by casting it to undefined', () => {
			const result = formatDate(null);
			assert.strictEqual(typeof result, 'string');
		});

		it('should handle undefined parameters', () => {
			const result = formatDate(undefined);
			assert.strictEqual(typeof result, 'string');
		});
	});

	describe('isInquiry', () => {
		it('should return true when procedureId matches INQUIRY', () => {
			assert.strictEqual(isInquiry(MOCK_INQUIRY_ID), true);
		});

		it('should return false when procedureId does not match INQUIRY', () => {
			assert.strictEqual(isInquiry('SOME_OTHER_ID'), false);
		});

		it('should return false when procedureId is null', () => {
			assert.strictEqual(isInquiry(null), false);
		});
	});

	describe('isHearing', () => {
		it('should return true when procedureId matches HEARING', () => {
			assert.strictEqual(isHearing(MOCK_HEARING_ID), true);
		});

		it('should return false when procedureId does not match HEARING', () => {
			assert.strictEqual(isHearing('SOME_OTHER_ID'), false);
		});

		it('should return false when procedureId is null', () => {
			assert.strictEqual(isHearing(null), false);
		});
	});

	describe('genericDevelopmentToViewModel', () => {
		const mockDevelopment: MinimumDevelopmentRequirements = {
			id: 'dev-123',
			reference: 'REF-2026-XYZ',
			description: 'Description goes here'
		};

		it('should correctly map base fields and merge extended fields from the formatting function', () => {
			const email = 'test@example.com';

			// Formatting function that returns the non-base GenericDevelopmentView fields
			const mockFormatter = (input: MinimumDevelopmentRequirements) => ({
				description: `Formatted: ${input.description}`
			});

			const expected: GenericDevelopmentView & { developmentContactEmail?: string } = {
				id: 'dev-123',
				reference: 'REF-2026-XYZ',
				developmentContactEmail: 'test@example.com',
				description: 'Formatted: Description goes here'
			};

			const result = mapDevelopmentToViewModel(mockDevelopment, email, mockFormatter);

			assert.deepStrictEqual(result, expected);
		});

		it('should handle undefined contact email gracefully', () => {
			interface TestDevelopmentListItem extends MinimumDevelopmentRequirements {
				customProp1: string;
				customProp2: string;
			}

			interface TestDevelopmentView extends GenericDevelopmentView {
				developmentContactEmail: string;
				testField1?: string;
				testField2?: string;
			}

			const specializedMockDevelopment: TestDevelopmentListItem = {
				id: 'dev-123',
				reference: 'REF-2026-XYZ',
				description: 'Description goes here',
				customProp1: 'Custom field 1',
				customProp2: 'Custom field 2'
			};

			function testViewFormattingFunction(testDevelopments: TestDevelopmentListItem) {
				const extendedFields: Omit<
					TestDevelopmentView,
					'id' | 'reference' | 'description' | 'developmentContactEmail'
				> = {};

				extendedFields.testField1 = testDevelopments.customProp1;
				extendedFields.testField2 = testDevelopments.customProp2;

				return extendedFields;
			}

			const result = mapDevelopmentToViewModel(specializedMockDevelopment, undefined, testViewFormattingFunction);

			assert.ok('developmentContactEmail' in result);
			assert.strictEqual((result as TestDevelopmentView).developmentContactEmail, undefined);

			assert.strictEqual((result as TestDevelopmentView).testField1, 'Custom field 1');
			assert.strictEqual((result as TestDevelopmentView).testField2, 'Custom field 2');
		});

		it('should ensure that the custom formatting function receives the correct development input', () => {
			const mockDevelopment: MinimumDevelopmentRequirements = {
				id: 'dev-123',
				reference: 'REF-2026-XYZ',
				description: 'Description goes here'
			};

			let receivedInput: MinimumDevelopmentRequirements | null = null;

			const trackingFormatter = (input: MinimumDevelopmentRequirements) => {
				receivedInput = input;
				return { description: 'stub' };
			};

			mapDevelopmentToViewModel(mockDevelopment, undefined, trackingFormatter);

			assert.deepStrictEqual(receivedInput, mockDevelopment);
		});
	});
});
