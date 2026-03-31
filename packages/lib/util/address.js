/**
 * @param {import('@pins/crowndev-database').Prisma.AddressGetPayload<{}> | null} address
 * @returns {import('@planning-inspectorate/dynamic-forms/src/lib/address.js').Address &{id: string}|undefined}
 */
export function addressToViewModel(address) {
	if (address) {
		return {
			id: address.id,
			addressLine1: address.line1 ?? '',
			addressLine2: address.line2 ?? '',
			townCity: address.townCity ?? '',
			county: address.county ?? '',
			postcode: address.postcode ?? ''
		};
	}
	return undefined;
}

/**
 * @param {import('@planning-inspectorate/dynamic-forms/src/lib/address.js').Address} edits
 * @returns {import('@pins/crowndev-database').Prisma.AddressCreateInput|null}
 */
export function viewModelToAddressUpdateInput(edits) {
	return {
		line1: edits?.addressLine1 ?? null,
		line2: edits?.addressLine2 ?? null,
		townCity: edits?.townCity ?? null,
		county: edits?.county ?? null,
		postcode: edits?.postcode ?? null
	};
}

/**
 * Check if object is an Address.
 *
 * @param {unknown} value
 * @returns {value is import('@planning-inspectorate/dynamic-forms/src/lib/address.js').Address}
 */
export function isAddress(value) {
	if (value == null || typeof value !== 'object') return false;

	const v = /** @type {Record<string, unknown>} */ (value);
	return (
		typeof v.addressLine1 === 'string' &&
		typeof v.addressLine2 === 'string' &&
		typeof v.townCity === 'string' &&
		typeof v.county === 'string' &&
		typeof v.postcode === 'string'
	);
}

/**
 * Check if addresses are identical
 *
 * @param {import('@planning-inspectorate/dynamic-forms/src/lib/address.js').Address} a Address A
 * @param {import('@planning-inspectorate/dynamic-forms/src/lib/address.js').Address} b Address B
 * @returns {boolean}
 */
export function isSameAddress(a, b) {
	return (
		a.addressLine1 === b.addressLine1 &&
		a.addressLine2 === b.addressLine2 &&
		a.townCity === b.townCity &&
		a.county === b.county &&
		a.postcode === b.postcode
	);
}
