import RequiredValidator from '@planning-inspectorate/dynamic-forms/src/validator/required-validator.js';
import StringValidator from '@planning-inspectorate/dynamic-forms/src/validator/string-validator.js';
import { createQuestions } from '@planning-inspectorate/dynamic-forms/src/questions/create-questions.js';
import { questionClasses } from '@planning-inspectorate/dynamic-forms/src/questions/questions.js';
import { COMPONENT_TYPES } from '@planning-inspectorate/dynamic-forms';

/**
 * @returns {{[p: string]: *}}
 */
export function getQuestions() {
	/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question-props.js').QuestionProps>} */
	const questions = {
		updateDetails: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Update details',
			question: 'Update details',
			hint: 'The recommended length is 1000 characters',
			fieldName: 'updateDetails',
			url: 'update-details',
			validators: [
				new RequiredValidator('Enter update details'),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Update details must be 1000 characters or less'
					}
				})
			]
		},
		publishNow: {
			type: COMPONENT_TYPES.BOOLEAN,
			title: 'Do you want to publish this update now?',
			question: 'Do you want to publish this update now?',
			hint: 'You can review the update before publishing',
			fieldName: 'publishNow',
			url: 'publish-now',
			validators: [new RequiredValidator()]
		}
	};

	return createQuestions(questions, questionClasses, {});
}
