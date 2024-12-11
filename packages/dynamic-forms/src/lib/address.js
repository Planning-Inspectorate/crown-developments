/**
 * Defines the shape of an address object
 * @class
 */
export class Address {
	/**
	 * @type {string} - the first line of the address
	 */
	addressLine1;

	/**
	 * @type {string} - the second line of the address
	 */
	addressLine2;

	/**
	 * @type {string} - the name of the town, city or other settlement
	 */
	townCity;

	/**
	 * @type {string} - the name of the town, city or other settlement
	 */
	county;

	/**
	 * @type {string} - the postcode
	 */
	postcode;

	/**
	 * creates an instance of an address
	 * @param {Object} params
	 * @param {string} params.addressLine1
	 * @param {string} params.addressLine2
	 * @param {string} params.townCity
	 * @param {string} params.county
	 * @param {string} params.postcode
	 */
	constructor({ addressLine1, addressLine2, townCity, county, postcode }) {
		if (addressLine1) {
			this.addressLine1 = addressLine1.trim();
		} else {
			throw new Error('Address requires addressLine1');
		}

		if (townCity) {
			this.townCity = townCity.trim();
		} else {
			throw new Error('Address requires townCity');
		}

		this.addressLine2 = addressLine2?.trim();
		this.county = county?.trim();
		this.postcode = postcode?.trim();
	}
}
