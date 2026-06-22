import {
	createQuestions,
	questionClasses,
	COMPONENT_TYPES,
	RequiredValidator
} from '@planning-inspectorate/dynamic-forms';
import {
	MAJOR_OR_NON_MAJORS,
	PRE_APPLICATION_OR_APPLICATIONS
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export function getQuestions() {
	const questions = {
		applicationStage: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application stage',
			question: 'Is this a pre-application or an application?',
			fieldName: 'applicationStage',
			url: 'pre-application-or-application',
			validators: [new RequiredValidator('Select whether this is a pre-application or an application')],
			options: PRE_APPLICATION_OR_APPLICATIONS.map((t) => ({ text: t.displayName, value: t.id }))
		},
		applicationClassification: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Application classification',
			question: 'Is this a major or non-major application?',
			fieldName: 'applicationClassification',
			url: 'major-or-non-major',
			validators: [new RequiredValidator('Select whether this is a major or non-major application')],
			options: MAJOR_OR_NON_MAJORS.map((t) => ({ text: t.displayName, value: t.id }))
		}
	};

	return createQuestions(questions, questionClasses, {});
}
