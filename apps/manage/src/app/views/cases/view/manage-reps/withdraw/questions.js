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
			hint: 'For example, 21 11 2020',
			fieldName: 'withdrawalDate',
			url: 'request-date',
			validators: [
				new DateValidator(
					'Withdrawal request date',
					{
						ensureFuture: false,
						ensurePast: false
					},
					{ emptyErrorMessage: 'Enter withdrawal request date' }
				)
			]
		},
		withdrawalReason: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Select the withdrawal reason',
			question: 'Select the withdrawal reason',
			description: 'Choose the reason for withdrawing the representation',
			fieldName: 'withdrawalReasonId',
			url: 'reason',
			validators: [new RequiredValidator()],
			options: referenceDataToRadioOptionsWithHintText(WITHDRAWAL_REASON)
		},
		withdrawalRequests: {
			type: CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS,
			title: 'Upload the withdrawal request',
			question: 'Upload the withdrawal request',
			fieldName: 'withdrawalRequests',
			url: 'upload-request',
			allowedFileExtensions: ALLOWED_EXTENSIONS,
			allowedMimeTypes: ALLOWED_MIME_TYPES,
			maxFileSizeValue: MAX_FILE_SIZE,
			maxFileSizeString: '20MB',
			showUploadWarning: false,
			validators: [new DocumentUploadValidator('withdrawalRequests')]
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
