import { body } from 'express-validator';
import BaseValidator from '@planning-inspectorate/dynamic-forms/src/validator/base-validator.js';
import type { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';

export interface UniqueMultipleListFieldValidatorParams {
	/** The manage list question's fieldName, e.g. 'vehicleParking' */
	listFieldName: string;
	/** Builds the error message from the duplicate's display name */
	buildErrorMessage: (displayName: string) => string;
	/** Resolves a single field value or full item to something readable */
	displayNameFor?: (value: string, item?: Record<string, unknown>) => string;
	/** Additional field names to check for fallback/conditional text values */
	secondaryFieldNames?: string[];
	/** Custom key generator for specialized domain logic */
	getCompositeKeys?: (item: Record<string, unknown>) => string[];
}

interface JourneyResponseLocals {
	journeyResponse?: {
		answers?: Record<string, unknown>;
	};
}

interface RequestWithJourneyLocals {
	body?: Record<string, unknown>;
	params?: { manageListItemId?: string };
	res?: {
		locals?: JourneyResponseLocals;
	};
}

export class UniqueMultipleListFieldValidator extends BaseValidator {
	private listFieldName: string;
	private buildErrorMessage: (displayName: string) => string;
	private displayNameFor: (value: string, item?: Record<string, unknown>) => string;
	private secondaryFieldNames: string[];
	private getCompositeKeys?: (item: Record<string, unknown>) => string[];

	constructor({
		listFieldName,
		buildErrorMessage,
		displayNameFor,
		secondaryFieldNames = [],
		getCompositeKeys
	}: UniqueMultipleListFieldValidatorParams) {
		super();
		this.listFieldName = listFieldName;
		this.buildErrorMessage = buildErrorMessage;
		this.displayNameFor = displayNameFor ?? ((value) => value);
		this.secondaryFieldNames = secondaryFieldNames;
		this.getCompositeKeys = getCompositeKeys;
	}

	validate(questionObj: Question) {
		return body(questionObj.fieldName).custom((value, meta) => {
			if (value === undefined || value === null || value === '') {
				return true;
			}

			const typedReq = meta.req as unknown as RequestWithJourneyLocals;

			const currentItemData: Record<string, unknown> = {
				...(typedReq.body ?? {}),
				[questionObj.fieldName]: value as unknown
			};

			const currentKeys = this.getItemKeys(currentItemData, questionObj.fieldName);

			if (currentKeys.length === 0) {
				return true;
			}

			const answers: Record<string, unknown> = typedReq.res?.locals?.journeyResponse?.answers ?? {};
			const items = (answers[this.listFieldName] as Record<string, unknown>[] | undefined) ?? [];
			const currentItemId = typedReq.params?.manageListItemId;

			const isDuplicate = items.some((existingItem) => {
				if (currentItemId && existingItem.id === currentItemId) {
					return false;
				}

				const existingKeys = this.getItemKeys(existingItem, questionObj.fieldName);

				return currentKeys.some((cKey) => existingKeys.includes(cKey));
			});

			if (isDuplicate) {
				const displayName = this.displayNameFor(String(value), currentItemData);
				throw new Error(this.buildErrorMessage(displayName));
			}

			return true;
		});
	}

	/**
	 * Generates all keys an item represents
	 */
	private getItemKeys(item: Record<string, unknown>, primaryFieldName: string): string[] {
		if (this.getCompositeKeys) {
			return this.getCompositeKeys(item).map((k) => k.toLowerCase().trim());
		}

		const primaryRaw = item[primaryFieldName];
		const primaryValue = typeof primaryRaw === 'string' ? primaryRaw.trim().toLowerCase() : '';

		if (!primaryValue) {
			return [];
		}

		if (this.secondaryFieldNames.length === 0) {
			return [primaryValue];
		}

		const keys: string[] = [];

		for (const field of this.secondaryFieldNames) {
			const rawVal = item[field];
			const val = typeof rawVal === 'string' ? rawVal.trim().toLowerCase() : '';
			if (val) {
				keys.push(`${primaryValue}::${val}`);
			}
		}

		return keys.length > 0 ? Array.from(new Set(keys)) : [primaryValue];
	}
}
