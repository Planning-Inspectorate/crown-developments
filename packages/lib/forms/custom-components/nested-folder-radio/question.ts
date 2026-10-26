import type { BaseQuestionViewData, CommonQuestionParams } from '@planning-inspectorate/dynamic-forms';
import { Question, type Journey, type QuestionViewModel, type Section } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

export interface FlatFolder {
	id: string;
	parentFolderId?: string | null;
	displayName: string;
}

export interface FolderNode extends FlatFolder {
	children: FolderNode[];
}

interface NestedFolderPreppedQuestion extends BaseQuestionViewData {
	value: string | null;
	folderList: FolderNode[];
	selectedPath: string[] | null;
}

export interface NestedFolderQuestionParams extends CommonQuestionParams {
	folderStructure: FolderNode[];
}

export interface NestedFolderQuestionProps extends NestedFolderQuestionParams {
	type: 'nested-folders';
}

export default class NestedFolderQuestion extends Question {
	folderStructure: FolderNode[];

	constructor(params: NestedFolderQuestionParams) {
		super({
			...params,
			viewFolder: 'custom-components/nested-folder-radio'
		});

		this.folderStructure = params.folderStructure;
	}

	/**
	 * Recursive helper to find path of some key (e.g. id or displayName), used when you return to the page and it has your answer saved from session
	 * and for rendering the final answer.
	 */
	private findPath(
		nodes: FolderNode[] | undefined,
		targetId: string,
		key: keyof FolderNode = 'id',
		currentPath: string[] = []
	): string[] | null {
		if (!nodes || !Array.isArray(nodes)) return null;

		for (const node of nodes) {
			// node[key] so that we can return either an array of ids, or an array of something else.
			const path = [...currentPath, node[key] as string];

			if (node.id === targetId) {
				return path;
			}

			if (node.children && node.children.length > 0) {
				const childPath = this.findPath(node.children, targetId, key, path);
				if (childPath) return childPath;
			}
		}
		return null;
	}

	/**
	 * Appends the folder structure to the view model
	 * and also finds the currently selected folder.
	 */
	override prepQuestionForRendering(
		section: Section,
		journey: Journey,
		customViewData: Record<string, unknown>,
		payload?: Record<string, unknown>
	): QuestionViewModel<NestedFolderPreppedQuestion> {
		const answer = payload ? payload[this.fieldName] : journey.response.answers[this.fieldName];

		const selectedPath = typeof answer === 'string' && answer ? this.findPath(this.folderStructure, answer) : null;
		const viewModel = super.prepQuestionForRendering(
			section,
			journey,
			customViewData,
			payload
		) as QuestionViewModel<NestedFolderPreppedQuestion>;

		viewModel.question.folderList = this.folderStructure || [];
		viewModel.question.selectedPath = selectedPath;

		return viewModel;
	}

	/**
	 * Finds the lowest selected folder to save.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await -- Must remain async to match OptionsQuestion override signature.
	override async getDataToSave(
		req: Request<ParamsDictionary, unknown, Record<string, unknown>>
	): Promise<{ answers: Record<string, unknown> }> {
		const { body } = req;

		let currentDepth = 0;
		let parentId = 'root';
		let finalValue = null;

		while (true) {
			const inputName = `${this.fieldName}_level_${currentDepth}_${parentId}`;
			const selectedValue = body[inputName];

			if (selectedValue) {
				finalValue = selectedValue;
				parentId = selectedValue as string;
				currentDepth++;
			} else {
				break;
			}
		}

		return {
			answers: {
				[this.fieldName]: finalValue
			}
		};
	}

	/**
	 * Overrides the summary formatter to return the Folder Name instead of ID
	 */
	override formatAnswerForSummary(sectionSegment: string, journey: Journey, answer: string | null) {
		if (answer && this.folderStructure && this.folderStructure.length > 0) {
			const pathNames = this.findPath(this.folderStructure, answer, 'displayName');

			if (pathNames) {
				const displayText = pathNames.join('\n/ ');
				return super.formatAnswerForSummary(sectionSegment, journey, displayText, false);
			}
		}

		return super.formatAnswerForSummary(sectionSegment, journey, answer);
	}
}
