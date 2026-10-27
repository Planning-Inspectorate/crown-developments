import { describe, it } from 'node:test';
import assert from 'node:assert';
import { vehicleParkingRemovalSummary, vehicleTypeName } from './vehicle-parking.ts';

describe('vehicle parking helpers', () => {
	describe('vehicleTypeName', () => {
		it("uses the vehicle type's display name", () => {
			assert.strictEqual(
				vehicleTypeName({ vehicleType: 'light_goods_vehicles_or_public_carrier_vehicles' }),
				'Light goods vehicles / public carrier vehicles'
			);
		});

		it("adds the entered type for 'Other', as the session stores it", () => {
			// eslint-disable-next-line camelcase -- conditional radio stores answers as `fieldName_conditionalFieldName`
			assert.strictEqual(
				vehicleTypeName({ vehicleType: 'other', vehicleType_otherVehicleType: 'Coaches' }),
				'Other: Coaches'
			);
		});

		it("adds the entered type for 'Other', as the view model stores it", () => {
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
				vehicleParkingRemovalSummary({ vehicleType: 'cars', existingSpaces: '4', proposedSpaces: '3' }),
				['<strong>Cars</strong>', '4 existing spaces', '3 proposed spaces']
			);
		});

		it('uses the singular for one space', () => {
			assert.deepStrictEqual(
				vehicleParkingRemovalSummary({ vehicleType: 'cars', existingSpaces: 1, proposedSpaces: '0' }).slice(1),
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
