import {
	type Journey,
	Question,
	type RouteParams,
	type Section,
	type QuestionViewModel,
	type JourneyResponse
} from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import nunjucks from 'nunjucks';
import { readSessionData } from '../../../util/session.ts';
import { getStringParams } from '../../../util/params.ts';
import type { MultiFileUploaderQuestionProps } from '../index.ts';

export interface DraftFile {
	id: string;
	fileName: string;
	itemId?: string;
}

export interface FileUploadViewData {
	draftFiles?: DraftFile[];
	files?: Record<string, Record<string, { uploadedFiles?: DraftFile[] }>>;
	[key: string]: unknown;
}

export interface UploadedFile {
	originalFileName: string;
	fileName: string;
	message: { html: string };
	deleteButton: { text: string };
}

export interface FileUploadViewModel extends QuestionViewModel {
	uploadedFiles?: UploadedFile[];
	uploadedFilesEncoded?: string;
	dataUploadUrl?: string;
	dataDeleteUrl?: string;
	allowedFileExtensions: string[];
	allowedMimeTypes: string[];
	maxFileSizeValue: number;
	maxFileSizeString: string;
	question: Record<string, unknown>;
	customViewData?: Record<string, unknown>;
}

export interface ToViewModelParams {
	params: RouteParams;
	section: Section;
	journey: Journey;
	customViewData?: FileUploadViewData;
	payload?: Record<string, unknown>;
}

/**
 * Renders and manages a multi-file upload component using the MOJ frontend styling.
 * Integrates with background AJAX uploads and Express sessions to persist draft state.
 *
 * To use this class you need to have an upload system that involves creating "drafts"
 * first, and once you do you save those into the session. This class will read those
 * session files when progressing the question.
 *
 * It is also advisable to have a middleware to read the in-progress ones so that if you
 * refresh the page before submitting, it retains the items. As questions normally
 * wipe answers if you select something but reload before submitting.
 */
export default class MultiFileUploadQuestion extends Question {
	public readonly dataUploadUrl: string;
	public readonly dataDeleteUrl: string;
	public readonly allowedFileExtensions: string[];
	public readonly allowedMimeTypes: string[];
	public readonly maxFileSizeValue: number;
	public readonly maxFileSizeString: string;
	public readonly preUploadHtml?: string;
	public readonly postUploadHtml?: string;
	public readonly showUploadWarning?: boolean;

	constructor(options: MultiFileUploaderQuestionProps) {
		super({
			...options,
			viewFolder: 'custom-components/multi-file-uploader'
		});

		// The URLs called by AJAX via the component
		this.dataUploadUrl = options.dataUploadUrl;
		this.dataDeleteUrl = options.dataDeleteUrl;

		this.allowedFileExtensions = options.allowedFileExtensions;
		this.allowedMimeTypes = options.allowedMimeTypes;
		this.maxFileSizeValue = options.maxFileSizeValue;
		this.maxFileSizeString = options.maxFileSizeString;

		this.preUploadHtml = options.preUploadHtml;
		this.postUploadHtml = options.postUploadHtml;
		this.showUploadWarning = options.showUploadWarning;
	}

	/**
	 * Prepares the view model for the Nunjucks template.
	 * Maps the session's draft files into the specific structure required by the MOJ upload component.
	 */
	toViewModel({ params, section, journey, customViewData, payload }: ToViewModelParams): FileUploadViewModel {
		const viewModel = super.toViewModel({
			params,
			section,
			journey,
			customViewData,
			payload
		}) as FileUploadViewModel;

		const { id, question } = getStringParams(params, ['id', 'question']);

		let draftFiles: DraftFile[] = [];

		if (customViewData?.files) {
			const sessionFiles = customViewData.files;
			draftFiles = sessionFiles[id]?.[question]?.uploadedFiles || [];
		}

		if (draftFiles.length === 0) {
			draftFiles = (journey.response.answers[this.fieldName] as DraftFile[]) || [];
		}

		const currentUrl = journey.getCurrentQuestionUrl(section.segment, this.fieldName);

		viewModel.question.uploadedFiles = this.mapDraftFilesToMojFormat(draftFiles);
		viewModel.question.dataUploadUrl = `${currentUrl}${this.dataUploadUrl}`;
		viewModel.question.dataDeleteUrl = `${currentUrl}${this.dataDeleteUrl}`;
		viewModel.question.allowedFileExtensions = this.allowedFileExtensions;
		viewModel.question.allowedMimeTypes = this.allowedMimeTypes;
		viewModel.question.maxFileSizeValue = this.maxFileSizeValue;
		viewModel.question.maxFileSizeString = this.maxFileSizeString;
		viewModel.question.preUploadHtml = this.preUploadHtml;
		viewModel.question.postUploadHtml = this.postUploadHtml;
		viewModel.question.showUploadWarning = this.showUploadWarning;

		return viewModel;
	}

	/**
	 * Formats the list of uploaded files for the "Check your answers" summary page.
	 * Renders a clickable list of file links using a standard Nunjucks attachment template.
	 */
	formatAnswerForSummary(
		...args: Parameters<Question['formatAnswerForSummary']>
	): ReturnType<Question['formatAnswerForSummary']> {
		const [sectionSegment, journey, answer] = args;

		let formattedAnswer = this.notStartedText ?? 'Not started';
		const action = this.getAction(sectionSegment, journey, answer);

		if (Array.isArray(answer) && answer.length > 0) {
			const baseUrl = journey.baseUrl;
			const items = this.mapFilesForSummary(answer as DraftFile[], baseUrl);

			formattedAnswer = nunjucks.render(`${this.viewFolder}/attachments-list.njk`, { items });
		}

		return [
			{
				key: this.title ?? 'Uploaded files',
				value: formattedAnswer,
				action
			}
		];
	}

	/**
	 * Intercepts the standard save process to pull the uploaded files from the Express session
	 * (where the AJAX controller placed them) rather than looking in `req.body`.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await -- Must remain async to match OptionsQuestion override signature.
	async getDataToSave(req: Request, journeyResponse: JourneyResponse) {
		const { id, question } = getStringParams(req.params, ['id', 'question']);

		const sessionQuestionData = readSessionData<{ uploadedFiles: DraftFile[] }>(
			req,
			id,
			question,
			{ uploadedFiles: [] },
			'files'
		);

		const uploadedFiles = sessionQuestionData !== false ? sessionQuestionData.uploadedFiles : [];

		journeyResponse.answers[this.fieldName] = uploadedFiles;

		return {
			answers: {
				[this.fieldName]: uploadedFiles
			}
		};
	}

	/**
	 * Maps standard draft files into the specific object structure expected by the MOJ Frontend macro.
	 */
	private mapDraftFilesToMojFormat(draftFiles: DraftFile[]): UploadedFile[] {
		return draftFiles.map((file) => ({
			originalFileName: file.fileName,
			fileName: file.fileName,
			message: {
				html: `<span class="moj-multi-file-upload__success">
                            <a href="/document/${file.id}">${file.fileName}</a>
                       </span>`
			},
			deleteButton: {
				text: 'Delete'
			}
		}));
	}

	/**
	 * Maps standard draft files into the simple `{ href, name }` structure expected by the summary view macro.
	 */
	private mapFilesForSummary(files: DraftFile[], baseUrl: string) {
		return files.map((file) => {
			const fileId = file.itemId || file.id || '';
			const href = typeof fileId === 'string' && fileId ? `${baseUrl}/document/${fileId}` : '#';

			return {
				href,
				name: file.fileName || 'Unknown file'
			};
		});
	}
}
