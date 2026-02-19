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
