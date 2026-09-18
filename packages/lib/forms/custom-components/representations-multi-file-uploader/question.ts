import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import MultiFileUploadQuestion from '../multi-file-uploader/question.ts';
import type { Journey } from '@planning-inspectorate/dynamic-forms';

/**
 * Multi file uploader for manage reps. Identical to normal except that when you are in
 * 'manage' mode your actions change to 'Manage | Add' rather than the default.
 */
export default class RepresentationsMultiFileUploadQuestion extends MultiFileUploadQuestion {
	getAction(sectionSegment: string, journey: Journey, answer: unknown) {
		if (journey.journeyId === 's62a-manage-representations') {
			const statusId = journey.response?.answers?.statusId;
			if (statusId === REPRESENTATION_STATUS_ID.ACCEPTED) {
				const manageTaskListUrl = journey.initialBackLink?.replace(/\/view$/, '/manage/task-list') || '/';
				return [
					...(Array.isArray(answer) && answer.length > 0
						? [
								{
									href: manageTaskListUrl,
									text: 'Manage',
									visuallyHiddenText: this.question
								}
							]
						: []),
					{
						href: journey.getCurrentQuestionUrl(sectionSegment, this.fieldName),
						text: this.addActionText,
						visuallyHiddenText: this.question
					}
				];
			}

			if (statusId === REPRESENTATION_STATUS_ID.REJECTED) {
				return undefined;
			}

			if (!this.editable) {
				return undefined;
			}

			return [
				{
					href: journey.getCurrentQuestionUrl(sectionSegment, this.fieldName),
					text: this.addActionText,
					visuallyHiddenText: this.question
				}
			];
		} else {
			return super.getAction(sectionSegment, journey, answer);
		}
	}
}
