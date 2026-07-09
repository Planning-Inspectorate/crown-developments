import { S62A_STATUSES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	COMPONENT_TYPES,
	createQuestions,
	questionClasses,
	RequiredValidator,
	StringValidator
} from '@planning-inspectorate/dynamic-forms';

export function getQuestions() {
	const questions = {
		developmentDescription: {
			type: COMPONENT_TYPES.TEXT_ENTRY,
			title: 'Development description',
			question: 'What is the description of the development?',
			fieldName: 'developmentDescription',
			url: 'development-description',
			validators: [
				new RequiredValidator('Enter a description of the development'),
				new StringValidator({
					maxLength: {
						maxLength: 1000,
						maxLengthMessage: 'Description of the development must be 1000 characters or less'
					}
				})
			]
		},
		applicationStatus: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Status',
			question: 'Which is the application status?',
			fieldName: 's62aStatusId',
			url: 'application-status',
			validators: [new RequiredValidator('Select the status for this application')],
			options: S62A_STATUSES.map((t) => ({ text: t.displayName, value: t.id }))
		}
	};

	return createQuestions(questions, questionClasses, {});
}
