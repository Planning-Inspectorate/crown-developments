import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.js';
import DateValidator from '@planning-inspectorate/dynamic-forms/src/validator/date-validator.js';
import DocumentUploadValidator from '@planning-inspectorate/dynamic-forms/src/validator/document-upload-validator.js';
import {
	ALLOWED_EXTENSIONS,
	ALLOWED_MIME_TYPES,
	MAX_FILE_SIZE
} from '@pins/crowndev-lib/forms/representations/question-utils.js';
import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import { referenceDataToRadioOptionsWithHintText } from '@pins/crowndev-lib/util/questions.js';
import { WITHDRAWAL_REASON } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @returns {{[p: string]: *}}
 */
export function getQuestions() {
	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {
		withdrawalDate: {
			type: COMPONENT_TYPES.DATE,
			title: 'Withdrawal Date',
			question: 'Enter date of withdrawal request',
			fieldName: 'withdrawalDate',
			url: 'withdrawal-date',
			validators: [new DateValidator('Withdrawal date')]
		},
		withdrawalReason: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Select the withdrawal reason',
			question: 'Select the withdrawal reason',
			fieldName: 'withdrawalReason',
			url: 'reason',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptionsWithHintText(WITHDRAWAL_REASON)
		},
		withdrawalRequest: {
			type: CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS,
			title: 'Upload the withdrawal request',
			question: 'Upload the withdrawal request',
			fieldName: 'withdrawalRequest',
			url: 'select-attachments',
			allowedFileExtensions: ALLOWED_EXTENSIONS,
			allowedMimeTypes: ALLOWED_MIME_TYPES,
			maxFileSizeValue: MAX_FILE_SIZE,
			maxFileSizeString: '20MB',
			validators: [new DocumentUploadValidator('withdrawalAttachments')]
		}
	};

	const textOverrides = {
		notStartedText: '-',
		continueButtonText: 'Save',
		changeActionText: 'Edit',
		answerActionText: 'Edit'
	};
	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};
	return createQuestions(questions, classes, {}, textOverrides);
}
