import { Question } from '@planning-inspectorate/dynamic-forms/src/questions/question.js';
import { nl2br } from '@planning-inspectorate/dynamic-forms/src/lib/utils.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { JOURNEY_MAP } from './upload-documents.js';

/**
 * @typedef {Object} TextEntryCheckbox
 * @property {string} header
 * @property {string} text
 * @property {string} name
 * @property {string} [errorMessage]
 */

const REDACTED_FLAG = 'Redacted';

/**
 * @class
 */
export default class RepresentationAttachments extends Question {
	/**
	 * @param {import('@planning-inspectorate/dynamic-forms/src/questions/question-types.js').QuestionParameters} params
	 * @param {Array<string>} allowedFileExtensions
	 * @param {Array<string>} allowedMimeTypes
	 * @param {number} maxFileSizeValue
	 * @param {number} maxFileSizeString
	 * @param {boolean} showUploadWarning
	 */
	constructor({
		allowedFileExtensions,
		allowedMimeTypes,
		maxFileSizeValue,
		maxFileSizeString,
		showUploadWarning,
		...params
	}) {
		super({
			...params,
			viewFolder: 'custom-components/representation-attachments'
		});

		this.allowedFileExtensions = allowedFileExtensions;
		this.allowedMimeTypes = allowedMimeTypes;
		this.maxFileSizeValue = maxFileSizeValue;
		this.maxFileSizeString = maxFileSizeString;
		this.showUploadWarning = showUploadWarning;
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		if (journey.baseUrl.endsWith('/edit')) {
			viewModel.question.value = payload ? payload[viewModel.question.fieldName] : [];
		} else {
			viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;
		}

		const submittedForId = journey.response?.answers?.submittedForId;
		const fileGroupKey = this.getFileGroupKey(submittedForId);

		const fileGroup = customViewData?.files?.[customViewData.id];
		const fileGroupUploadedFiles = fileGroup?.[fileGroupKey]?.uploadedFiles ?? [];
		const uploadedFiles = fileGroupUploadedFiles.length > 0 ? fileGroupUploadedFiles : viewModel.question.value;

		viewModel.uploadedFiles = uploadedFiles;
		viewModel.uploadedFilesEncoded = Buffer.from(JSON.stringify(uploadedFiles), 'utf-8').toString('base64');

		viewModel.question.allowedFileExtensions = this.allowedFileExtensions;
		viewModel.question.allowedMimeTypes = this.allowedMimeTypes;
		viewModel.question.maxFileSizeValue = this.maxFileSizeValue;
		viewModel.question.maxFileSizeString = this.maxFileSizeString;
		viewModel.question.showUploadWarning = this.showUploadWarning;

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
		const isRedactedField = this.fieldName.includes(REDACTED_FLAG);

		return [
			{
				key: this.title,
				value,
				action: isRedactedField ? null : this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	getAction(sectionSegment, journey, answer) {
		if (journey.journeyId === 'manage-representations') {
			const statusId = journey.response?.answers?.statusId;
			if (statusId === REPRESENTATION_STATUS_ID.ACCEPTED) {
				const manageTaskListUrl = journey.initialBackLink.replace(/\/view$/, '/manage/task-list');
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
		const applicationId = req.params.representationRef || req.params.id || req.params.applicationId;
		const submittedForId = journeyResponse.answers?.submittedForId;
		const fileKey = this.getFileGroupKey(submittedForId);

		responseToSave.answers[this.fieldName] = req.session.files?.[applicationId]?.[fileKey]?.uploadedFiles;
		journeyResponse.answers[this.fieldName] = responseToSave.answers[this.fieldName];

		return responseToSave;
	}

	getFileGroupKey(submittedForId) {
		return this.fieldName === 'withdrawalRequests' ? 'withdraw' : JOURNEY_MAP[submittedForId];
	}
}
