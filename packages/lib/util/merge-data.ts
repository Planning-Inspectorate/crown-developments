/**
 * Combine session answers with DB answers for any given View Model type.
 *
 * Session answers take precedence unless they are undefined or null.
 * For array answers (e.g., manage list questions), the arrays are merged
 * such that items with matching IDs are merged together to preserve
 * any unchanged data from the DB.
 */
export function combineSessionAndDbData<T extends object>(dbAnswers: T, sessionAnswers?: Partial<T> | null): T {
	const finalAnswers = { ...dbAnswers };

	if (!sessionAnswers || Object.keys(sessionAnswers).length === 0) {
		return finalAnswers;
	}

	(Object.keys(sessionAnswers) as Array<keyof T>).forEach(<K extends keyof T>(key: K) => {
		finalAnswers[key] = mergeAnswerValue<T[K]>(dbAnswers[key], sessionAnswers[key]);
	});

	return finalAnswers;
}

/**
 * Helper to merge a DB answer value with a session answer value
 */
export function mergeAnswerValue<V>(dbValue: V, sessionValue: V | undefined | null): V {
	if (sessionValue === undefined || sessionValue === null) {
		return dbValue;
	}

	if (isMergeableAnswerArray(dbValue) && isMergeableAnswerArray(sessionValue)) {
		return mergeArraysById(dbValue, sessionValue) as unknown as V;
	}

	return sessionValue;
}

/**
 * Helper to determine if an answer is an array of objects that can be merged by ID
 */
export function isMergeableAnswerArray(value: unknown): value is Array<{ id?: PropertyKey | null } & object> {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				item !== null &&
				typeof item === 'object' &&
				!Array.isArray(item) &&
				Object.prototype.hasOwnProperty.call(item, 'id')
		)
	);
}

/**
 * Helper to merge two arrays of objects
 *
 * If a session item has an ID that matches a DB item, it is merged with it to overwrite the different keys.
 * If no match is found, it is appended as a new item.
 */
export function mergeArraysById<T extends { id?: PropertyKey | null }>(dbArray: T[], sessionArray: T[]): T[] {
	const merged = [...dbArray];

	sessionArray.forEach((sessionItem) => {
		const existingIndex = merged.findIndex((dbItem) => dbItem.id && sessionItem.id && dbItem.id === sessionItem.id);

		if (existingIndex !== -1) {
			// If not found (-1) spread the two items together such that the new session data overwrites the key
			merged[existingIndex] = { ...merged[existingIndex], ...sessionItem };
		} else {
			merged.push(sessionItem);
		}
	});

	return merged;
}
