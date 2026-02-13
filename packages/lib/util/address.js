/**
 * @param {import('@pins/crowndev-database').Prisma.AddressGetPayload<{}> | null} address
 * @returns {import('@planning-inspectorate/dynamic-forms/src/lib/address.js').Address &{id: string}|{}}
 */
export function addressToViewModel(address) {
	if (address) {
		return {
			id: address.id,
			addressLine1: address.line1 ?? undefined,
			addressLine2: address.line2 ?? undefined,
			townCity: address.townCity ?? undefined,
			county: address.county ?? undefined,
			postcode: address.postcode ?? undefined
		};
	}
	return {};
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
