import { type PageValidation } from '../page-utilities/page-validation.utility.ts';

export type PageDisplayOptions = {
	pageValidation?: PageValidation;
	timeout?: number;
};

export type ApplicationVariant = 'application' | 'preApplication';
