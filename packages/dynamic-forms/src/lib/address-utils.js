/**
 * @param {import('@prisma/client').Prisma.AddressGetPayload<{}>} address
 * @returns {string}
 */
export function addressToViewModel(address) {
	const fields = [address.line1, address.line2, address.townCity, address.county, address.postcode];
	return fields.filter(Boolean).join(', ');
}
