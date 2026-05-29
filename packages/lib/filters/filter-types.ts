import type { DateFilterInput } from './date-filter.ts';

/**
 * Shared types for filter sections used across documents and written-representations
 */

export interface CheckboxItem {
	displayName: string;
	text: string;
	value: string;
	checked: boolean;
}

export interface CheckboxOptions {
	items: CheckboxItem[];
}

export interface CheckboxFilter {
	title: string;
	type: 'checkboxes';
	name: string;
	options: CheckboxOptions;
	open?: boolean;
}

export interface DateFilter {
	title: string;
	type: 'date-input';
	name: string;
	dateInputs: DateFilterInput[];
	open?: boolean;
	hasErrors?: boolean;
}

export type FilterSection = CheckboxFilter | DateFilter;

export interface FilterQueryItem {
	label: string;
	id: string;
	displayName: string;
	queryKeys?: string[];
}

export type QueryFilters = Record<string, string | string[] | null | undefined>;
