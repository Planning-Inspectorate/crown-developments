import { Question } from '@pins/dynamic-forms/src/questions/question.js';
import { nl2br } from '@pins/dynamic-forms/src/lib/utils.js';
import { clearSessionData } from '../../../util/session.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @typedef {Object} TextEntryCheckbox
 * @property {string} header
 * @property {string} text
 * @property {string} name
 * @property {string} [errorMessage]
 */

/**
 * @class
 */
export default class RepresentationAttachments extends Question {
	/**
	 * @param {import('@pins/dynamic-forms/src/questions/question-types.js').QuestionParameters} params
	 * @param {Array<string>} allowedFileExtensions
	 * @param {Array<string>} allowedMimeTypes
	 * @param {number} maxFileSizeValue
	 * @param {number} maxFileSizeString
	 */
	constructor({ allowedFileExtensions, allowedMimeTypes, maxFileSizeValue, maxFileSizeString, ...params }) {
		super({
			...params,
			viewFolder: 'custom-components/representation-attachments'
		});

		this.allowedFileExtensions = allowedFileExtensions;
		this.allowedMimeTypes = allowedMimeTypes;
		this.maxFileSizeValue = maxFileSizeValue;
		this.maxFileSizeString = maxFileSizeString;
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;

		const submittedForId = journey.response?.answers?.submittedForId;
		const fileGroup = customViewData?.files?.[customViewData.id];
		const fileGroupUploadedFiles = fileGroup?.[submittedForId]?.uploadedFiles ?? [];
		const uploadedFiles = fileGroupUploadedFiles.length > 0 ? fileGroupUploadedFiles : viewModel.question.value;

		viewModel.uploadedFiles = uploadedFiles;
		viewModel.uploadedFilesEncoded = Buffer.from(JSON.stringify(uploadedFiles), 'utf-8').toString('base64');

		viewModel.question.allowedFileExtensions = this.allowedFileExtensions;
		viewModel.question.allowedMimeTypes = this.allowedMimeTypes;
		viewModel.question.maxFileSizeValue = this.maxFileSizeValue;
		viewModel.question.maxFileSizeString = this.maxFileSizeString;

		return viewModel;
	}

	checkForValidationErrors(req, sectionObj, journey) {
		const { session = {}, body = {}, params, originalUrl } = req;
		const { errors: bodyErrors = {}, errorSummary: bodyErrorSummary = [] } = body;
		const { errors: sessionErrors = {}, errorSummary: sessionErrorSummary = [] } = session;

		const hasBodyErrors = bodyErrorSummary.length > 0;
		const hasSessionErrors = sessionErrorSummary.length > 0;

		if (hasBodyErrors || hasSessionErrors) {
			return this.prepQuestionForRendering(sectionObj, journey, {
				id: params.id || params.applicationId,
				currentUrl: originalUrl,
				files: session.files,
				errors: hasBodyErrors ? bodyErrors : sessionErrors,
				errorSummary: hasBodyErrors ? bodyErrorSummary : sessionErrorSummary
			});
		}
	}

	formatAnswerForSummary(sectionSegment, journey, answer) {
		const hasFiles = Array.isArray(answer) && answer.length > 0;
		const value = hasFiles ? nl2br(answer.map((file) => file.fileName).join('\n')) : '-';

		return [
			{
				key: this.title,
				value,
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	getAction(sectionSegment, journey, answer) {
		if (journey.journeyId === 'manage-representations') {
			const statusId = journey.response?.answers?.statusId;
			if (statusId === REPRESENTATION_STATUS_ID.ACCEPTED) {
				const manageTaskListUrl = journey.initialBackLink.replace(/\/view$/, '/manage/task-list');
				return [
					{
						href: manageTaskListUrl,
						text: this.manageActionText,
						visuallyHiddenText: this.question
					},
					{
						href: manageTaskListUrl,
						text: this.addActionText,
						visuallyHiddenText: this.question
					}
				];
			}

			if (statusId === REPRESENTATION_STATUS_ID.REJECTED) {
				return null;
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

	async getDataToSave(req, journeyResponse) {
		let responseToSave = { answers: {} };
		const applicationId = req.params.id || req.params.applicationId;
		const submittedForId = journeyResponse.answers?.submittedForId;

		responseToSave.answers[this.fieldName] = req.session.files?.[applicationId]?.[submittedForId]?.uploadedFiles;
		journeyResponse.answers[this.fieldName] = responseToSave.answers[this.fieldName];

		clearSessionData(req, applicationId, [submittedForId], 'files');

		return responseToSave;
	}
}
