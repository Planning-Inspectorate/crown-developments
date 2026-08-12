import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JourneyResponse, Journey, type Question } from '@planning-inspectorate/dynamic-forms';
import { getQuestions } from './questions.js';
import { addRepresentationSection } from './s62a-sections.ts';

describe('s62a-sections', () => {
	describe('addRepresentationSection', () => {
		const JOURNEY_ID = 's62a-add-rep-1';

		it('should return the correct representation section with all required questions', () => {
			const questions = getQuestions();
			const sections = addRepresentationSection(questions);

			assert.strictEqual(sections.length, 1);

			const representationSection = sections[0];
			assert.strictEqual(representationSection.name, 'Representation');
			assert.strictEqual(representationSection.segment, 'start');

			assert.strictEqual(representationSection.questions.length, 5);
			representationSection.questions.forEach((q: Question | undefined) => {
				assert.ok(q !== undefined, 'Question should be defined');
			});
		});

		it('should integrate correctly when passed into a Journey object', () => {
			const questions = getQuestions();
			const answers: Record<string, unknown> = {};

			const createJourney = (
				questionsObj: Record<string, Question>,
				responseObj: JourneyResponse,
				req: { baseUrl: string }
			): Journey => {
				return new Journey({
					journeyId: JOURNEY_ID,
					sections: addRepresentationSection(questionsObj),
					makeBaseUrl: () => req.baseUrl,
					journeyTemplate: 'template.njk',
					taskListTemplate: 'template-2.njk',
					journeyTitle: 'Add S62A Representation',
					response: responseObj
				});
			};

			const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
			const journey = createJourney(questions, response, {
				baseUrl: `/some/path/${JOURNEY_ID}`
			});

			const sections = journey.sections;

			assert.strictEqual(sections.length, 1);
			sections.forEach((section) =>
				section.questions.forEach((q: Question | undefined) => {
					assert.ok(q !== undefined, 'Question should be defined');
				})
			);
		});

		it('should conditionally render questions correctly (currently they all display)', () => {
			const questions = getQuestions();
			const sections = addRepresentationSection(questions);

			sections[0].questions.forEach((question: Question) => {
				assert.strictEqual(question.shouldDisplay(), true, 'Base questions should always display');
			});
		});
	});
});
