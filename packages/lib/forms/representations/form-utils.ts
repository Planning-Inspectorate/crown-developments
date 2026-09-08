import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { RECEIVED_METHOD_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import type { HaveYourSayManageModel } from './types.js';

export function buildRepresentationQuestions(
	answers: HaveYourSayManageModel,
	taskListUrl: string,
	isS62a: boolean = false
) {
	return getQuestions({
		methodOverrides: {
			initialValues: { submittedReceivedMethodId: answers?.submittedReceivedMethodId }
		},
		textOverrides: {
			notStartedText: '-',
			continueButtonText: 'Save',
			changeActionText: 'Edit',
			answerActionText: 'Edit'
		},
		actionOverrides: {
			statusShouldShowManageAction: answers?.statusId !== REPRESENTATION_STATUS_ID.WITHDRAWN,
			redactedCommentShowManageAction: answers?.statusId === REPRESENTATION_STATUS_ID.ACCEPTED,
			canEditAttachmentsUploaded: answers?.statusId !== REPRESENTATION_STATUS_ID.REJECTED,
			distressingContentInRepresentationShowManageAction: answers?.statusId !== REPRESENTATION_STATUS_ID.REJECTED,
			taskListUrl
		},
		editActionOverrides: {
			submittedReceivedMethodShouldShowEditAction:
				answers?.submittedReceivedMethodId != null && answers?.submittedReceivedMethodId !== RECEIVED_METHOD_ID.ONLINE
		},
		isS62a
	});
}
