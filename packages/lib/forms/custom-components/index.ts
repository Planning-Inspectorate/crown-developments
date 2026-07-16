import RepresentationComment from './representation-comment/question.js';
import { default as FeeAmountQuestion, type FeeAmountQuestionProps } from './fee-amount/question.ts';
import RepresentationAttachments from './representation-attachments/question.js';
import CILAmountQuestion from './cil-amount/question.js';
import CostsApplicationsCommentQuestion from './costs-applications-comment/question.js';
import CustomManageListQuestion from './manage-list/question.js';
import CustomMultiFieldInputQuestion from './custom-multi-field-input/question.js';
import {
	default as DistressingContentQuestion,
	type DistressingContentQuestionProps
} from './distressing-content/question.ts';
import type { CommonQuestionProps, QuestionProps, QuestionTypes } from '@planning-inspectorate/dynamic-forms';
import HiddenRadioQuestion from './radio-with-hidden-options/question.ts';

type CustomComponentTypes = (typeof CUSTOM_COMPONENTS)[keyof typeof CUSTOM_COMPONENTS];

export type CrownCommonQuestionProps = Omit<CommonQuestionProps, 'type'> & {
	type: QuestionTypes | CustomComponentTypes;
};

/**
 * TODO all of these individual question props to be moved to the question files
 * once they are converted to TypeScript CROWN-1647
 */

type RepresentationAttachmentsQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS;
	allowedFileExtensions: string[];
	allowedMimeTypes: string[];
	maxFileSizeValue: number;
	maxFileSizeString: string;
	showUploadWarning: boolean;
};

type RepresentationCommentQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.REPRESENTATION_COMMENT;
	textEntryCheckbox?: {
		header: string;
		text: string;
		name: string;
		errorMessage?: string;
	};
	label?: string;
};

export type CILAmountQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.CIL_AMOUNT;
	cilAmountInputFieldName: string;
	cilAmountQuestion: string;
	fieldToShow: string;
};

type CostsApplicationsCommentQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.COSTS_APPLICATIONS;
	costsApplicationInputFieldName: string;
	costsApplicationQuestion: string;
};

// TODO define this using ManageListQuestionParameters once export from dynamic forms is fixed
type CustomManageListQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST;
	titleSingular: string;
	showAnswersInSummary?: boolean;
	maximumAnswers?: number;
	emptyListText?: string;
	isAllowedEmpty?: boolean;
	confirmRemoveButtonText?: string;
	removalPrompt?: string;
};

type CustomMultiFieldInputAffix = {
	text: string;
	classes?: string;
};

type CustomMultiFieldBaseField = {
	fieldName: string;
	formatJoinString?: string;
	formatPrefix?: string;
	formatTextFunction?: (value: string) => string;
};

type CustomMultiFieldInputField = CustomMultiFieldBaseField & {
	type: 'single-line-input';
	label: string;
	attributes?: Record<string, string>;
	autocomplete?: string;
	suffix?: CustomMultiFieldInputAffix;
	prefix?: CustomMultiFieldInputAffix;
};

type CustomMultiFieldRadioField = CustomMultiFieldBaseField & {
	type: 'radio';
	label?: string;
	legend?: string;
	options: Array<{ text: string; value: string; attributes?: Record<string, string> }>;
};

type CustomMultiFieldHiddenField = CustomMultiFieldBaseField & {
	type: 'hidden';
	value: string;
};

type CustomMultiFieldBooleanFieldInput = CustomMultiFieldBaseField & {
	type: 'boolean';
	question: string;
	hint?: string;
	options?: Array<{ text: string; value: string }>;
};

type CustomMultiFieldInputQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT;
	label?: string;
	inputAttributes?: Record<string, string>;
	inputFields: (
		| CustomMultiFieldInputField
		| CustomMultiFieldRadioField
		| CustomMultiFieldHiddenField
		| CustomMultiFieldBooleanFieldInput
	)[];
};

export type CrownQuestionProps =
	| QuestionProps
	| RepresentationAttachmentsQuestionProps
	| RepresentationCommentQuestionProps
	| FeeAmountQuestionProps
	| CILAmountQuestionProps
	| CostsApplicationsCommentQuestionProps
	| CustomManageListQuestionProps
	| CustomMultiFieldInputQuestionProps
	| DistressingContentQuestionProps;

export const CUSTOM_COMPONENTS = Object.freeze({
	REPRESENTATION_ATTACHMENTS: 'representation-attachments',
	REPRESENTATION_COMMENT: 'representation-comment',
	FEE_AMOUNT: 'fee-amount',
	CIL_AMOUNT: 'cil-amount',
	COSTS_APPLICATIONS: 'costs-applications',
	CUSTOM_MANAGE_LIST: 'manage-list',
	CUSTOM_MULTI_FIELD_INPUT: 'custom-multi-field-input',
	DISTRESSING_CONTENT: 'distressing-content',
	RADIO_WITH_HIDDEN_OPTIONS: 'radio-with-hidden-options'
} as const);

export const CUSTOM_COMPONENT_CLASSES = Object.freeze({
	[CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS]: RepresentationAttachments,
	[CUSTOM_COMPONENTS.REPRESENTATION_COMMENT]: RepresentationComment,
	[CUSTOM_COMPONENTS.FEE_AMOUNT]: FeeAmountQuestion,
	[CUSTOM_COMPONENTS.CIL_AMOUNT]: CILAmountQuestion,
	[CUSTOM_COMPONENTS.COSTS_APPLICATIONS]: CostsApplicationsCommentQuestion,
	[CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST]: CustomManageListQuestion,
	[CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT]: CustomMultiFieldInputQuestion,
	[CUSTOM_COMPONENTS.DISTRESSING_CONTENT]: DistressingContentQuestion,
	[CUSTOM_COMPONENTS.RADIO_WITH_HIDDEN_OPTIONS]: HiddenRadioQuestion
} as const);
