import {
	createQuestions,
	questionClasses,
	COMPONENT_TYPES,
	RequiredValidator
} from '@planning-inspectorate/dynamic-forms';
import { PRE_APPLICATION_OR_APPLICATIONS } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export function getQuestions() {
	const questions = {
		preApplicationOrApplication: {
			type: COMPONENT_TYPES.RADIO,
			title: 'Pre-application or application?',
			question: 'Is this a pre-application or an application?',
			fieldName: 'preApplicationOrApplication',
			url: 'pre-application-or-application',
			validators: [new RequiredValidator('Select whether this is a pre-application or an application')],
			options: PRE_APPLICATION_OR_APPLICATIONS.map((t) => ({ text: t.displayName, value: t.id }))
		}
	};

	return createQuestions(questions, questionClasses, {});
}
