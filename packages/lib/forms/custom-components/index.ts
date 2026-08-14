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
import ConditionalRadioQuestion from './conditional-radio/question.ts';
import MultiConditionalRadioQuestion from './multi-conditional-radio/question.ts';
import CustomNumberInputQuestion from './custom-number-input/question.ts';
import TableManageListQuestion from './manage-list/table/question.ts';
import DefinedColumnsTableQuestion, {
	type TableColumn
} from './manage-list/table/defined-columns-list-table/question.ts';
import MultiFileUploadQuestion from './multi-file-uploader/question.ts';

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

type TableManageListQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.MANAGE_LIST_TABLE;
	titleSingular: string;
	showAnswersInSummary?: boolean;
	summaryLimit?: number;
	hideRemoveOnLastItem?: boolean;
	removalPrompt?: string;
	emptyName?: string;
	emptyNamePlural?: string;
	hideCancel?: boolean;
	hideBackLink?: boolean;
	hideButtonsEmpty?: boolean;
	warningText?: string;
};

type DefinedColumnsTableQuestionProps = Omit<TableManageListQuestionProps, 'type'> & {
	type: typeof CUSTOM_COMPONENTS.DEFINED_COLUMNS_TABLE;
	columns: TableColumn[];
};

export type MultiFileUploaderQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.MULTI_FILE_UPLOADER;
	dataUploadUrl: string;
	dataDeleteUrl: string;
	allowedFileExtensions: string[];
	allowedMimeTypes: string[];
	maxFileSizeValue: number;
	maxFileSizeString: string;
	preUploadHtml?: string;
	postUploadHtml?: string;
	showUploadWarning?: boolean;
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
	| DistressingContentQuestionProps
	| TableManageListQuestionProps
	| DefinedColumnsTableQuestionProps
	| MultiFileUploaderQuestionProps;

export const CUSTOM_COMPONENTS = Object.freeze({
	REPRESENTATION_ATTACHMENTS: 'representation-attachments',
	REPRESENTATION_COMMENT: 'representation-comment',
	FEE_AMOUNT: 'fee-amount',
	CIL_AMOUNT: 'cil-amount',
	COSTS_APPLICATIONS: 'costs-applications',
	CUSTOM_MANAGE_LIST: 'manage-list',
	CUSTOM_MULTI_FIELD_INPUT: 'custom-multi-field-input',
	DISTRESSING_CONTENT: 'distressing-content',
	RADIO_WITH_HIDDEN_OPTIONS: 'radio-with-hidden-options',
	CONDITIONAL_RADIO: 'conditional-radio',
	MULTI_CONDITIONAL_RADIO: 'multi-conditional-radio',
	MANAGE_LIST_TABLE: 'manage-list-table',
	DEFINED_COLUMNS_TABLE: 'defined-columns-table',
	CUSTOM_NUMBER_INPUT: 'custom-number-input',
	MULTI_FILE_UPLOADER: 'multi-file-uploader'
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
	[CUSTOM_COMPONENTS.RADIO_WITH_HIDDEN_OPTIONS]: HiddenRadioQuestion,
	[CUSTOM_COMPONENTS.CONDITIONAL_RADIO]: ConditionalRadioQuestion,
	[CUSTOM_COMPONENTS.MULTI_CONDITIONAL_RADIO]: MultiConditionalRadioQuestion,
	[CUSTOM_COMPONENTS.MANAGE_LIST_TABLE]: TableManageListQuestion,
	[CUSTOM_COMPONENTS.DEFINED_COLUMNS_TABLE]: DefinedColumnsTableQuestion,
	[CUSTOM_COMPONENTS.CUSTOM_NUMBER_INPUT]: CustomNumberInputQuestion,
	[CUSTOM_COMPONENTS.MULTI_FILE_UPLOADER]: MultiFileUploadQuestion
} as const);
