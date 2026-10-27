import { describe, it } from 'node:test';
import assert from 'node:assert';
import { toVehicleParkingRow, vehicleParkingRemovalSummary, vehicleTypeName } from './vehicle-parking.ts';

describe('vehicle parking helpers', () => {
	describe('toVehicleParkingRow', () => {
		it('reads a saved row from the view model', () => {
			const row = toVehicleParkingRow({
				id: 'v1',
				vehicleParkingRelationId: 'v1',
				vehicleType: 'other',
				otherVehicleType: 'Coaches',
				existingSpaces: 4,
				proposedSpaces: 3
			});

			assert.deepStrictEqual(row, {
				vehicleType: 'other',
				otherVehicleType: 'Coaches',
				existingSpaces: 4,
				proposedSpaces: 3
			});
		});

		it('reads an unsaved row from the session, where the form stores text', () => {
			const row = toVehicleParkingRow({
				vehicleType: 'other',
				// eslint-disable-next-line camelcase -- conditional radio stores answers as `fieldName_conditionalFieldName`
				vehicleType_otherVehicleType: 'Coaches',
				existingSpaces: '4',
				proposedSpaces: '0'
			});

			assert.deepStrictEqual(row, {
				vehicleType: 'other',
				otherVehicleType: 'Coaches',
				existingSpaces: 4,
				proposedSpaces: 0
			});
		});

		it('leaves out anything not yet entered', () => {
			assert.deepStrictEqual(toVehicleParkingRow({ vehicleType: 'cars', existingSpaces: '' }), {
				vehicleType: 'cars',
				otherVehicleType: undefined,
				existingSpaces: undefined,
				proposedSpaces: undefined
			});
		});

		it('ignores spaces that are not a whole number', () => {
			const row = toVehicleParkingRow({ existingSpaces: 'abc', proposedSpaces: '1.5' });

			assert.strictEqual(row.existingSpaces, undefined);
			assert.strictEqual(row.proposedSpaces, undefined);
		});
	});

	describe('vehicleTypeName', () => {
		it("uses the vehicle type's display name", () => {
			assert.strictEqual(
				vehicleTypeName({ vehicleType: 'light_goods_vehicles_or_public_carrier_vehicles' }),
				'Light goods vehicles / public carrier vehicles'
			);
		});

		it("adds the entered type for 'Other'", () => {
			assert.strictEqual(vehicleTypeName({ vehicleType: 'other', otherVehicleType: 'Coaches' }), 'Other: Coaches');
		});

		it("ignores 'Other' text left over after the type was changed", () => {
			assert.strictEqual(vehicleTypeName({ vehicleType: 'cars', otherVehicleType: 'Coaches' }), 'Cars');
		});

		it('is undefined without a vehicle type', () => {
			assert.strictEqual(vehicleTypeName({}), undefined);
		});
	});

	describe('vehicleParkingRemovalSummary', () => {
		it('shows the vehicle type in bold, then the existing and proposed spaces', () => {
			assert.deepStrictEqual(
				vehicleParkingRemovalSummary({ vehicleType: 'cars', existingSpaces: 4, proposedSpaces: 3 }),
				['<strong>Cars</strong>', '4 existing spaces', '3 proposed spaces']
			);
		});

		it('uses the singular for one space', () => {
			assert.deepStrictEqual(
				vehicleParkingRemovalSummary({ vehicleType: 'cars', existingSpaces: 1, proposedSpaces: 0 }).slice(1),
				['1 existing space', '0 proposed spaces']
			);
		});

		it('leaves out anything not yet entered', () => {
			assert.deepStrictEqual(vehicleParkingRemovalSummary({ vehicleType: 'cars' }), ['<strong>Cars</strong>']);
		});

		it('escapes entered text', () => {
			const [name] = vehicleParkingRemovalSummary({ vehicleType: 'other', otherVehicleType: '<b>Vans</b> & co' });

			assert.strictEqual(name, '<strong>Other: &lt;b&gt;Vans&lt;/b&gt; &amp; co</strong>');
		});
	});
});
