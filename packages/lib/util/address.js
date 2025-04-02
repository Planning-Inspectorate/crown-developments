/**
 * @param {import('@prisma/client').Prisma.AddressGetPayload<{}>} address
 * @returns {import('@pins/dynamic-forms/src/lib/address.js').Address}
 */
export function addressToViewModel(address) {
	if (address) {
		return {
			id: address.id,
			addressLine1: address.line1,
			addressLine2: address.line2,
			townCity: address.townCity,
			county: address.county,
			postcode: address.postcode
		};
	}
	return {};
}

/**
 * @param {import('@pins/dynamic-forms/src/lib/address.js').Address} edits
 * @returns {import('@prisma/client').Prisma.AddressCreateInput|null}
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
