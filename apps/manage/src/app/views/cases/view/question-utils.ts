import {
	DateValidator,
	MultiFieldInputValidator,
	RequiredValidator,
	StringValidator,
	COMPONENT_TYPES
} from '@planning-inspectorate/dynamic-forms';
import { referenceDataToRadioOptions } from '@pins/crowndev-lib/util/questions.ts';
import {
	APPLICATION_PROCEDURE_ID,
	APPLICATION_STAGE,
	APPLICATION_STAGE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { CUSTOM_COMPONENTS, type CILAmountQuestionProps } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import CILAmountValidator from '@pins/crowndev-lib/forms/custom-components/cil-amount/cil-amount-validator.ts';
import { camelCaseToUrlCase, camelCaseToSentenceCase, sentenceCase } from '@pins/crowndev-lib/util/string.ts';
import type { QuestionProps, Option } from '@planning-inspectorate/dynamic-forms';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

/**
 * Generate a standard date question
 *
 * title should be uncapitalised (unless it's a proper noun)
 * validationTitle should be uncapitalised (unless it's a proper noun). Only required if specified differently to title in validation messages.
 */
export function dateQuestion({
	fieldName,
	title,
	hint,
	editable = true,
	viewData = {},
	question,
	emptyErrorMessage = null,
	validationTitle = null
}: {
	fieldName: string;
	title?: string;
	hint?: string;
	editable?: boolean;
	viewData?: Record<string, unknown>; // more specific?
	question?: string;
	emptyErrorMessage?: string | null;
	validationTitle?: string | null;
}): QuestionProps {
	// remove capitalisation for fallback title, since used in fallback question
	const fallbackTitle = camelCaseToSentenceCase(fieldName).toLowerCase();
	if (!title) {
		title = fallbackTitle;
	}
	validationTitle = validationTitle ?? title;
	return {
		type: COMPONENT_TYPES.DATE,
		title: sentenceCase(title),
		question: question || `What is the ${title}?`,
		hint: hint,
		fieldName: fieldName,
		url: camelCaseToUrlCase(fieldName),
		validators: [
			new DateValidator(
				validationTitle,
				{ ensureFuture: false, ensurePast: false },
				{ emptyErrorMessage: emptyErrorMessage }
			)
		],
		editable: editable,
		viewData
	};
}

/**
 * Generate a standard set of event questions
 */
export function eventQuestions(prefix: string): Record<string, QuestionProps> {
	const title = sentenceCase(prefix);
	return {
		[`${prefix}Date`]: dateQuestion({
			fieldName: `${prefix}Date`,
			viewData: {
				extraActionButtons: [
					{
						text: 'Remove and save',
						type: 'submit',
						formaction: `${camelCaseToUrlCase(prefix)}-date/remove`
					}
				]
			},
			question: `What is the ${prefix} date?`
		}),
		[`${prefix}Duration`]: {
			type: COMPONENT_TYPES.MULTI_FIELD_INPUT,
			title: `${title} duration`,
			question: `What is the ${prefix} duration?`,
			fieldName: `${prefix}Duration`,
			url: `${prefix}-duration`,
			inputFields: [
				{
					fieldName: `${prefix}DurationPrep`,
					label: 'Prep',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Prep: ',
					formatJoinString: ' days\r\n',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				},
				{
					fieldName: `${prefix}DurationSitting`,
					label: 'Sitting',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Sitting: ',
					formatJoinString: ' days\r\n',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				},
				{
					fieldName: `${prefix}DurationReporting`,
					label: 'Reporting',
					classes: 'govuk-input--width-5',
					formatPrefix: 'Reporting: ',
					formatJoinString: ' days',
					inputmode: 'numeric',
					pattern: '[0-9]*',
					suffix: { text: 'days' }
				}
			],
			validators: [
				new MultiFieldInputValidator({
					fields: [
						{
							fieldName: `${prefix}DurationPrep`,
							required: false,
							regex: {
								regex: '^$|^\\d+(\\.\\d+)?$', // Accepts empty or a decimal/integer
								regexMessage: 'Prep must be a number'
							}
						},
						{
							fieldName: `${prefix}DurationSitting`,
							required: false,
							regex: {
								regex: '^$|^\\d+(\\.\\d+)?$', // Accepts empty or a decimal/integer
								regexMessage: 'Sitting must be a number'
							}
						},
						{
							fieldName: `${prefix}DurationReporting`,
							required: false,
							regex: {
								regex: '^$|^\\d+(\\.\\d+)?$', // Accepts empty or a decimal/integer
								regexMessage: 'Reporting must be a number'
							}
						}
					]
				})
			]
		},
		[`${prefix}Venue`]: {
			type: COMPONENT_TYPES.SINGLE_LINE_INPUT,
			title: `${title} venue`,
			question: `What is the venue of the ${prefix}?`,
			fieldName: `${prefix}Venue`,
			url: `${prefix}-venue`,
			validators: [
				new RequiredValidator(`Enter ${prefix} venue`),
				new StringValidator({
					maxLength: {
						maxLength: 250,
						maxLengthMessage: `${title} venue must be less than 250 characters`
					}
				})
			]
		},
		[`${prefix}NotificationDate`]: dateQuestion({
			fieldName: `${prefix}NotificationDate`,
			question: `What is the ${prefix} notification date?`
		}),
		[`${prefix}IssuesReportPublishedDate`]: dateQuestion({
			fieldName: `${prefix}IssuesReportPublishedDate`,
			question: `When was the ${prefix} issues report published?`,
			validationTitle: `date the ${prefix} issues report was published`
		}),
		[`${prefix}ProcedureNotificationDate`]: dateQuestion({
			fieldName: `${prefix}ProcedureNotificationDate`,
			title: 'Notice of procedure date'
		}),
		[`${prefix}StatementsDate`]: dateQuestion({ fieldName: `${prefix}StatementsDate` }),
		[`${prefix}CaseManagementConferenceDate`]: dateQuestion({ fieldName: `${prefix}CaseManagementConferenceDate` }),
		[`${prefix}PreMeetingDate`]: dateQuestion({
			fieldName: `${prefix}PreMeetingDate`,
			title: 'Pre-inquiry meeting date'
		}),
		[`${prefix}ProofsOfEvidenceDate`]: dateQuestion({
			fieldName: `${prefix}ProofsOfEvidenceDate`,
			title: `${sentenceCase(prefix)} proofs of evidence date`
		})
	};
}

/**
 * Convert subcategory data to radio options
 */
export function subCategoriesToRadioOptions(categories: readonly Prisma.CategoryCreateInput[]): Option[] {
	const parents = categories.filter((c) => !('ParentCategory' in c));
	const parentIdToName = Object.fromEntries(parents.map((p) => [p.id, p.displayName ?? '']));
	const subCategories = categories
		.filter(
			(
				c
			): c is Prisma.CategoryCreateInput & {
				ParentCategory: NonNullable<Prisma.CategoryCreateInput['ParentCategory']>;
			} => 'ParentCategory' in c && c.ParentCategory !== undefined
		)
		.map((c) => {
			const parentId = c.ParentCategory.connect?.id;
			const parentName = parentId ? parentIdToName[parentId] : '';
			return {
				displayName: `${parentName}\n ` + c.displayName,
				id: c.id
			};
		});
	return referenceDataToRadioOptions(subCategories);
}

export type Reference = {
	id: string;
	displayName: string;
};

export function getFilteredStages(procedureId?: string): Reference[] {
	const stageIds: (typeof APPLICATION_STAGE_ID)[keyof typeof APPLICATION_STAGE_ID][] = [
		APPLICATION_STAGE_ID.ACCEPTANCE,
		APPLICATION_STAGE_ID.CONSULTATION,
		APPLICATION_STAGE_ID.PROCEDURE_DECISION
	];
	if (procedureId) {
		const mappedProcedureId =
			procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS
				? APPLICATION_STAGE_ID.WRITTEN_REPRESENTATIONS
				: procedureId;
		const procedure = APPLICATION_STAGE.find((procedure) => procedure.id === mappedProcedureId);
		const procedureStage = APPLICATION_STAGE.find((stage) => stage.displayName === procedure?.displayName)?.id;
		if (procedureStage) {
			stageIds.push(procedureStage);
		}
	}
	stageIds.push(APPLICATION_STAGE_ID.DECISION);
	return APPLICATION_STAGE.filter((stage) => stageIds.includes(stage.id)).map((s) => ({
		id: s.id,
		displayName: s.displayName ?? ''
	}));
}

export const CIL_DATA = {
	type: CUSTOM_COMPONENTS.CIL_AMOUNT,
	question: 'Is the application liable for the Community Infrastructure Levy (CIL)?',
	fieldName: 'cilLiable',
	url: 'cil-liable',
	cilAmountInputFieldName: 'cilAmount',
	cilAmountQuestion: 'What is the CIL amount?',
	validators: [new CILAmountValidator()]
} as const satisfies Omit<CILAmountQuestionProps, 'fieldToShow' | 'title'>;
