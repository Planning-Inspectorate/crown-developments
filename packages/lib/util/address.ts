import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { Address } from '@planning-inspectorate/dynamic-forms';

/**
 * Convert a database address to a view model address.
 */
export function addressToViewModel(
	address: Prisma.AddressGetPayload<object> | null
): (Address & { id: string }) | undefined {
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
 * Convert a view model address to a database address update input.
 */
export function viewModelToAddressUpdateInput(edits: Address): Prisma.AddressCreateInput {
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
 */
export function isAddress(value: unknown): value is Address {
	if (value == null || typeof value !== 'object') return false;

	const v = value as Record<string, unknown>;
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
 */
export function isSameAddress(a: Address, b: Address): boolean {
	return (
		a.addressLine1 === b.addressLine1 &&
		a.addressLine2 === b.addressLine2 &&
		a.townCity === b.townCity &&
		a.county === b.county &&
		a.postcode === b.postcode
	);
}
