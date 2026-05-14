import { getFilenameStem, isString } from './string.ts';

export type Comparator = Record<string, string | number>;

/**
 * Returns a sort function to sort an array of objects by a given field.
 */
export function sortByField<T extends Comparator>(field: keyof T, reverse?: boolean): (a: T, b: T) => number {
	return (a: T, b: T): number => {
		const aValue = a[field];
		const bValue = b[field];

		if (aValue > bValue) return reverse ? -1 : 1;
		if (aValue < bValue) return reverse ? 1 : -1;

		return 0;
	};
}

/**
 * Returns a sort function to sort an array of objects by the filename stem of a given field.
 * If the field value is not a string, it will be treated as undefined and sorted accordingly.
 */
export function sortByFileName<T extends Comparator>(
	filenameField: keyof T,
	reverse?: boolean
): (a: T, b: T) => number {
	return (a: T, b: T): number => {
		const aFile = isString(a[filenameField]) ? getFilenameStem(a[filenameField]) : undefined;
		const bFile = isString(b[filenameField]) ? getFilenameStem(b[filenameField]) : undefined;

		if (aFile === undefined && bFile === undefined) return 0;
		if (aFile === undefined) return 1;
		if (bFile === undefined) return -1;

		const result = aFile.localeCompare(bFile);
		return reverse ? -result : result;
	};
}

/**
 * Returns a comparator function that combines multiple comparators.
 * The combined comparator will apply each comparator in order until a non-zero result is found, which will be returned.
 * If all comparators return zero, the combined comparator will return zero.
 */
export function combineComparators<T extends Comparator>(
	comparators: ((a: T, b: T) => number)[]
): (a: T, b: T) => number {
	return (a: T, b: T): number => {
		for (const comparator of comparators) {
			const result = comparator(a, b);
			if (result !== 0) {
				return result;
			}
		}
		return 0;
	};
}
