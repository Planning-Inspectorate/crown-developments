import { Question } from '@pins/dynamic-forms/src/questions/question.js';
import { nl2br } from '@pins/dynamic-forms/src/lib/utils.js';

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
	 * @param {string|undefined} [params.label] if defined this show as a label for the input and the question will just be a standard h1
	 */
	constructor({ label, ...params }) {
		super({
			...params,
			viewFolder: 'custom-components/representation-attachments'
		});

		this.label = label;
	}

	prepQuestionForRendering(section, journey, customViewData, payload) {
		let viewModel = super.prepQuestionForRendering(section, journey, customViewData);
		viewModel.question.value = payload ? payload[viewModel.question.fieldName] : viewModel.question.value;

		const submittedForId = journey.response?.answers?.submittedForId;
		const fileGroup = customViewData?.files?.[customViewData.id];
		const uploadedFiles = fileGroup?.[submittedForId]?.uploadedFiles ?? [];

		viewModel.uploadedFiles = uploadedFiles;
		viewModel.uploadedFilesJson = JSON.stringify(uploadedFiles);

		//TODO: add errors and errorSummary

		return viewModel;
	}

	buildRenderingContext(req, errors, errorSummary) {
		return {
			id: req.params.id || req.params.applicationId,
			currentUrl: req.originalUrl,
			files: req.session?.files,
			errors,
			errorSummary
		};
	}

	formatAnswerForSummary(sectionSegment, journey, answer) {
		const formattedAnswer = nl2br(answer.map((file) => file.name).join('\n'));
		return [
			{
				key: `${this.title}`,
				value: formattedAnswer,
				action: this.getAction(sectionSegment, journey, answer)
			}
		];
	}

	async getDataToSave(req, journeyResponse) {
		let responseToSave = { answers: {} };
		const applicationId = req.params.id || req.params.applicationId;
		const submittedForId = journeyResponse.answers?.submittedForId;

		responseToSave.answers[this.fieldName] = req.session.files?.[applicationId]?.[submittedForId]?.uploadedFiles;
		journeyResponse.answers[this.fieldName] = responseToSave.answers[this.fieldName];

		return responseToSave;
	}
}
