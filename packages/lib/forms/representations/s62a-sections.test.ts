import { describe, it } from 'node:test';
import assert from 'node:assert';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS, JourneyResponse, Journey, type Question } from '@planning-inspectorate/dynamic-forms';
import { getQuestions } from './questions.js';
import { addRepresentationSection } from './s62a-sections.ts';

describe('s62a-sections', () => {
	describe('addRepresentationSection', () => {
		const JOURNEY_ID = 's62a-add-rep-1';

		it('should return the correct representation sections with all required questions', () => {
			const questions = getQuestions();
			const sections = addRepresentationSection(questions);

			assert.strictEqual(sections.length, 2);

			const representationSection = sections[0];
			assert.strictEqual(representationSection.name, 'Representation');
			assert.strictEqual(representationSection.segment, 'start');

			assert.strictEqual(representationSection.questions.length, 5);

			representationSection.questions.forEach((q: Question | undefined) => {
				assert.ok(q !== undefined, 'Question in Representation section should be defined');
			});

			const myselfSection = sections[1];
			assert.strictEqual(myselfSection.name, 'Myself');
			assert.strictEqual(myselfSection.segment, 'myself');
			assert.strictEqual(myselfSection.questions.length, 8);

			myselfSection.questions.forEach((q: Question | undefined) => {
				assert.ok(q !== undefined, 'Question in Myself section should be defined');
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

			assert.strictEqual(sections.length, 2);
			sections.forEach((section) =>
				section.questions.forEach((q: Question | undefined) => {
					assert.ok(q !== undefined, 'Question should be defined');
				})
			);
		});

		it('should conditionally render questions correctly', () => {
			const questions = getQuestions();
			const sections = addRepresentationSection(questions);

			const emptyResponse = new JourneyResponse(JOURNEY_ID, 'session-id', {});

			sections[0].questions.forEach((question) => {
				assert.strictEqual(
					question.shouldDisplay(emptyResponse),
					true,
					`${question.fieldName} in base section should always display`
				);
			});

			const getMyselfQuestion = (fieldName: string) => sections[1].questions.find((q) => q.fieldName === fieldName)!;

			const emailQuestion = getMyselfQuestion(questions.myselfEmail.fieldName);
			const emailResponse = new JourneyResponse(JOURNEY_ID, 'session-id', {
				[questions.submittedFor.fieldName]: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				[questions.myselfContactPreference.fieldName]: 'email'
			});
			assert.strictEqual(
				emailQuestion.shouldDisplay(emailResponse),
				true,
				'Email should display when preference is email'
			);
			assert.strictEqual(
				emailQuestion.shouldDisplay(emptyResponse),
				false,
				'Email should NOT display when preference is missing'
			);

			const addressQuestion = getMyselfQuestion(questions.myselfAddress.fieldName);
			const postResponse = new JourneyResponse(JOURNEY_ID, 'session-id', {
				[questions.submittedFor.fieldName]: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				[questions.myselfContactPreference.fieldName]: 'post'
			});
			assert.strictEqual(
				addressQuestion.shouldDisplay(postResponse),
				true,
				'Address should display when preference is post'
			);
			assert.strictEqual(
				addressQuestion.shouldDisplay(emptyResponse),
				false,
				'Address should NOT display when preference is missing'
			);

			const attachmentsQuestion = getMyselfQuestion(questions.myselfSelectBlobAttachments.fieldName);
			const hasAttachmentsResponse = new JourneyResponse(JOURNEY_ID, 'session-id', {
				[questions.submittedFor.fieldName]: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				[questions.myselfHasAttachments.fieldName]: BOOLEAN_OPTIONS.YES
			});
			assert.strictEqual(
				attachmentsQuestion.shouldDisplay(hasAttachmentsResponse),
				true,
				'Select attachments should display when hasAttachments is YES'
			);
			assert.strictEqual(
				attachmentsQuestion.shouldDisplay(emptyResponse),
				false,
				'Select attachments should NOT display when hasAttachments is missing'
			);
		});
	});
});
