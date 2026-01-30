import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import CustomManageListQuestion from './question.js';
import { mockJourney } from '@planning-inspectorate/dynamic-forms/test/mock/journey.js';
import { mockRandomUUID } from '@planning-inspectorate/dynamic-forms/test/mock/uuid.js';
import { ManageListSection } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-section.js';
import nunjucks from 'nunjucks';

describe('ManageApplicantsQuestion', () => {
	const TITLE = 'Applicants';
	const QUESTION = 'Manage applicants';
	const DESCRIPTION = 'A list of applicants';
	const FIELDNAME = 'manageApplicantsTest';
	const newQuestion = (options = {}) => {
		return new CustomManageListQuestion({
			title: TITLE,
			question: QUESTION,
			description: DESCRIPTION,
			fieldName: FIELDNAME,
			titleSingular: 'Applicant',
			maximumAnswers: 5,
			...options
		});
	};

	it('should create', () => {
		const question = newQuestion();
		assert.strictEqual(question.title, TITLE);
		assert.strictEqual(question.question, QUESTION);
		assert.strictEqual(question.description, DESCRIPTION);
		assert.strictEqual(question.fieldName, FIELDNAME);
		assert.strictEqual(question.viewFolder, 'custom-components/manage-list');
		assert.strictEqual(question.isManageListQuestion, true);
	});

	it('should populate addAnotherLink & firstQuestionUrl', (context) => {
		const question = newQuestion();
		mockRandomUUID(context);
		question.section = new ManageListSection().addQuestion({ url: 'first-question' });
		const viewModel = question.prepQuestionForRendering({}, mockJourney());
		// add/<v4-guid>/<question-url>
		assert.match(viewModel?.question?.addAnotherLink, /^add\/00000000-0000-0000-0000-000000000000\/first-question/);
		assert.strictEqual(viewModel?.question?.firstQuestionUrl, 'first-question');
	});

	const questionWithManageQuestions = (context, options, answersToGenerate) => {
		const question = newQuestion(options);
		const innerQ1 = {
			url: 'first-question',
			title: 'Q 1',
			formatAnswerForSummary() {
				return [{ value: 'mock answer' }];
			}
		};
		const innerQ2 = {
			url: 'second-question',
			title: 'Q 2',
			formatAnswerForSummary() {
				return [{ value: 'mock answer 2' }];
			}
		};
		mockRandomUUID(context);
		const journey = mockJourney();
		const answers = [];
		for (let i = 0; i < answersToGenerate; i++) {
			answers.push({ id: `id-${i + 1}` });
		}
		journey.response.answers = {
			[FIELDNAME]: answers
		};
		question.section = new ManageListSection().addQuestion(innerQ1).addQuestion(innerQ2);
		return { question, journey };
	};

	describe('addCustomDataToViewModel', () => {
		it('should hide the remove button if only one is added', (context) => {
			const { question, journey } = questionWithManageQuestions(context, {}, 1);
			const viewModel = question.prepQuestionForRendering({}, journey);
			assert.strictEqual(viewModel?.question.hideRemoveButton, true);
		});

		it('should show remove button if more than one answer', (context) => {
			const { question, journey } = questionWithManageQuestions(context, {}, 3);
			const viewModel = question.prepQuestionForRendering({}, journey);
			assert.strictEqual(viewModel?.question.hideRemoveButton, false);
		});

		it('should hide add button if maximum answers reached', (context) => {
			const { question, journey } = questionWithManageQuestions(context, {}, 5);
			const viewModel = question.prepQuestionForRendering({}, journey);
			assert.strictEqual(viewModel?.hideAddButton, true);
		});

		it('should show add button if maximum answers not reached', (context) => {
			const { question, journey } = questionWithManageQuestions(context, {}, 3);
			const viewModel = question.prepQuestionForRendering({}, journey);
			assert.strictEqual(viewModel?.hideAddButton, false);
		});
	});

	describe('formatAnswerForSummary', () => {
		it('should format list answer for summary', (context) => {
			const { question, journey } = questionWithManageQuestions(context, {}, 5);
			mockRandomUUID(context);
			nunjucks.render = mock.fn(() => 'mocked rendered string');
			const answerForSummary = question.formatAnswerForSummary('section-1', journey, [{}, {}, {}]);
			assert.strictEqual(answerForSummary.length, 1);
			assert.strictEqual(nunjucks.render.mock.callCount(), 1);
			assert.strictEqual(answerForSummary[0].value, 'mocked rendered string');
		});
	});

	describe('checkForValidationErrors', () => {
		it('should return view model if there are validation errors', (context) => {
			const { question, journey } = questionWithManageQuestions(context, {}, 5);
			mockRandomUUID(context);
			const req = {
				body: {
					errors: {
						someField: 'Some error'
					},
					errorSummary: [
						{
							text: 'Some error',
							href: '#someField'
						}
					]
				},
				params: {},
				originalUrl: '/some-url'
			};
			const viewModel = question.checkForValidationErrors(req, question.section, journey, question);
			assert.ok(viewModel);
			assert.strictEqual(viewModel.errors.someField, 'Some error');
			assert.strictEqual(viewModel.errorSummary.length, 1);
			assert.strictEqual(viewModel.originalUrl, '/some-url');
		});
	});
});
