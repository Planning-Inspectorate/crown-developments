import crypto from 'node:crypto';

/**
 * Generate a unique reference for a representation.
 * Will error after 10 tries.
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {() => string} [generateReference] - this is for testing
 * @returns {Promise<string>}
 */
export async function uniqueReference(db, generateReference = generateNewReference) {
	const MAX_TRIES = 10;
	for (let i = 0; i < MAX_TRIES; i++) {
		const reference = generateReference();
		const count = await db.representation.count({ where: { reference } });
		if (count === 0) {
			return reference;
		}
	}
	throw new Error('unable to generate a unique reference');
}

/**
 * Generate a new reference in the format: AAAAA-BBBBB
 * @returns {string}
 */
export function generateNewReference() {
	const ref = crypto.randomBytes(5).toString('hex').toUpperCase();
	return ref.replace(/([A-Z0-9]{5})([A-Z0-9]{5})/, '$1-$2');
}

export function isValidUniqueReference(reference) {
	// Check if the reference is in the format AAAAA-BBBBB
	const regex = /^[A-F0-9]{5}-[A-F0-9]{5}$/;
	return regex.test(reference);
}
