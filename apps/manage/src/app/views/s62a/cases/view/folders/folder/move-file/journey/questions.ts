import { createQuestions, questionClasses } from '@planning-inspectorate/dynamic-forms';
import { CUSTOM_COMPONENT_CLASSES, CUSTOM_COMPONENTS } from '@pins/crowndev-lib/forms/custom-components/index.ts';
import type { FolderNode } from '@pins/crowndev-lib/forms/custom-components/nested-folder-radio/question.ts';
import NestedRequiredValidator from '@pins/crowndev-lib/forms/custom-components/nested-folder-radio/validator.ts';

export function getQuestions(folderStructure: FolderNode[] | undefined) {
	const questions = {
		moveFolder: {
			type: CUSTOM_COMPONENTS.NESTED_FOLDERS,
			title: 'File location',
			question: 'File location',
			fieldName: 'fileLocation',
			url: 'file-location',
			folderStructure,
			validators: [new NestedRequiredValidator()]
		}
	};

	const classes = {
		...questionClasses,
		...CUSTOM_COMPONENT_CLASSES
	};

	return createQuestions(questions, classes, {});
}

export type MoveFileQuestions = ReturnType<typeof getQuestions>;
