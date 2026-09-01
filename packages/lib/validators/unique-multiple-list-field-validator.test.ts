import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { UniqueMultipleListFieldValidator } from './unique-multiple-list-field-validator.ts';

interface VehicleParkingItem {
	id: string;
	vehicleType: string;
	vehicleParkingRelationId?: string;
	otherVehicleType?: string | undefined;
	existingSpaces?: number | null;
	proposedSpaces?: number | null;
	vehicleType_otherVehicleType?: string;
}

describe('UniqueMultipleListFieldValidator', () => {
	let validator: UniqueMultipleListFieldValidator;
	let mockQuestion: Question;

	beforeEach(() => {
		validator = new UniqueMultipleListFieldValidator({
			listFieldName: 'vehicleParking',
			secondaryFieldNames: ['otherVehicleType', 'vehicleType_otherVehicleType'],
			displayNameFor: (value, item) => {
				const parkingItem = item as Partial<VehicleParkingItem> | undefined;
				const otherText = parkingItem?.otherVehicleType || parkingItem?.vehicleType_otherVehicleType;
				return value === 'other' && otherText ? `Other (${otherText})` : value;
			},
			buildErrorMessage: (name) => `You have already added ${name}.`
		});

		mockQuestion = {
			fieldName: 'vehicleType'
		} as Question;
	});

	const runValidation = (
		value: string,
		body: Record<string, unknown>,
		items: Partial<VehicleParkingItem>[],
		currentItemId?: string
	) => {
		const validationChain = validator.validate(mockQuestion);
		const req = {
			body,
			params: { manageListItemId: currentItemId },
			res: {
				locals: {
					journeyResponse: {
						answers: {
							vehicleParking: items
						}
					}
				}
			}
		};

		const context = (validationChain as any).builder.build();
		const customValidator = context.stack?.[0]?.validator || context.validators?.[0]?.validator;

		if (!customValidator) {
			throw new Error('Could not extract validator function from express-validator chain.');
		}

		return customValidator(value, { req });
	};

	describe('Case 1: other, example, undefined', () => {
		it('should pass when no existing items match "other::example"', () => {
			const result = runValidation('other', { otherVehicleType: 'example' }, [{ id: '1', vehicleType: 'cars' }]);
			assert.strictEqual(result, true);
		});

		it('should fail when an existing item matches "other::example" via vehicleType_otherVehicleType (Field Swap)', () => {
			assert.throws(() => {
				runValidation('other', { otherVehicleType: 'example' }, [
					{ id: '1', vehicleType: 'other', vehicleType_otherVehicleType: 'example' }
				]);
			}, /You have already added Other \(example\)\./);
		});
	});

	describe('Case 2: other, undefined, example 1', () => {
		it('should pass when no existing items match "other::example 1"', () => {
			const result = runValidation('other', { vehicleType_otherVehicleType: 'example 1' }, [
				{ id: '1', vehicleType: 'other', otherVehicleType: 'example' }
			]);
			assert.strictEqual(result, true);
		});

		it('should fail when an existing item matches "other::example 1" via otherVehicleType', () => {
			assert.throws(() => {
				runValidation('other', { vehicleType_otherVehicleType: 'example 1' }, [
					{ id: '1', vehicleType: 'other', otherVehicleType: 'example 1' }
				]);
			}, /You have already added Other \(example 1\)\./);
		});
	});

	describe('Case 3: other, example, example 1', () => {
		it('should fail if an existing item matches "other::example"', () => {
			assert.throws(() => {
				runValidation('other', { otherVehicleType: 'example', vehicleType_otherVehicleType: 'example 1' }, [
					{ id: '1', vehicleType: 'other', otherVehicleType: 'example' }
				]);
			}, /You have already added/);
		});

		it('should fail if an existing item matches "other::example 1"', () => {
			assert.throws(() => {
				runValidation('other', { otherVehicleType: 'example', vehicleType_otherVehicleType: 'example 1' }, [
					{ id: '1', vehicleType: 'other', vehicleType_otherVehicleType: 'example 1' }
				]);
			}, /You have already added/);
		});
	});

	describe('Case 4: cars, undefined, undefined', () => {
		it('should pass when "cars" is not in the list', () => {
			const result = runValidation('cars', {}, [{ id: '1', vehicleType: 'motorcycles' }]);
			assert.strictEqual(result, true);
		});

		it('should fail when "cars" is already in the list', () => {
			assert.throws(() => {
				runValidation('cars', {}, [{ id: '1', vehicleType: 'cars' }]);
			}, /You have already added cars\./);
		});
	});

	describe('Duplicate vehicleType_otherVehicleType matching', () => {
		it('should fail when two entries have identical vehicleType_otherVehicleType values', () => {
			assert.throws(() => {
				runValidation('other', { vehicleType_otherVehicleType: 'Minibus' }, [
					{ id: '1', vehicleType: 'other', vehicleType_otherVehicleType: 'minibus' }
				]);
			}, /You have already added Other \(Minibus\)\./);
		});
	});

	describe('Editing Existing Item', () => {
		it('should ignore duplicate check for the item currently being edited', () => {
			const result = runValidation(
				'other',
				{ otherVehicleType: 'example' },
				[{ id: 'edit-123', vehicleType: 'other', otherVehicleType: 'example' }],
				'edit-123'
			);
			assert.strictEqual(result, true);
		});
	});
});
