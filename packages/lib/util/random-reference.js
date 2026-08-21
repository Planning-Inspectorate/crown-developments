import crypto from 'node:crypto';

/**
 * Generate a unique reference for a representation.
 * Will error after 10 tries.
 *
 * @param {import('@pins/crowndev-database').PrismaClient} db
 * @param {() => string} [generateReference] - this is for testing
 * @returns {Promise<string>}
 */
export async function uniqueReference(db, generateReference = generateNewReference, model = 'crown') {
	const MAX_TRIES = 10;
	for (let i = 0; i < MAX_TRIES; i++) {
		const reference = generateReference();
		let count;

		switch (model) {
			case 'crown':
				count = await crownQuery(db, reference);
				break;
			case 's62a':
				count = await s62aQuery(db, reference);
				break;
			default:
				break;
		}

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

function crownQuery(db, reference) {
	return db.representation.count({ where: { reference } });
}

function s62aQuery(db, reference) {
	return db.s62aRepresentation.count({ where: { reference } });
}
