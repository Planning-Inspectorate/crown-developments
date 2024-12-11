import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Section, SECTION_STATUS } from './section.js';

const mockQuestion = {
	fieldName: 'visitFrequently',
	isRequired: () => true,
	shouldDisplay: () => true,
	isAnswered: () => false
};

describe('./src/dynamic-forms/section.js', () => {
	describe('constructor', () => {
		it('should create', () => {
			const SECTION_NAME = 'Section1';
			const SEGMENT = 'A SEGMENT';
			const section = new Section(SECTION_NAME, SEGMENT);
			assert.strictEqual(section.name, SECTION_NAME);
			assert.strictEqual(section.segment, SEGMENT);
		});
	});

	describe('addQuestion', () => {
		it('should return self from addQuestion method as a fluent api', () => {
			const section = new Section('s1', 'S');
			const result = section.addQuestion(mockQuestion);
			assert.strictEqual(result instanceof Section, true);
			assert.strictEqual(result, section);
		});

		it('should add a question', () => {
			const section = new Section('s1', 'S');
			section.addQuestion(mockQuestion);
			assert.strictEqual(section.questions.length, 1);
			assert.strictEqual(section.questions[0], mockQuestion);
		});
	});

	describe('getStatus', () => {
		it('should return NOT_STARTED when no answers are given', () => {
			const mockJourneyResponse = {
				answers: {}
			};
			const section = new Section('s1', 'S');
			section.addQuestion(mockQuestion);
			const result = section.getStatus(mockJourneyResponse);
			assert.strictEqual(result, SECTION_STATUS.NOT_STARTED);
			const isComplete = section.isComplete(mockJourneyResponse);
			assert.strictEqual(isComplete, false);
		});

		it('should return IN_PROGRESS when at least one answer is given', () => {
			const mockJourneyResponse = {
				answers: {
					visitFrequently: 'Answer 1'
				}
			};

			const section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion, isAnswered: () => true });
			section.addQuestion({ ...mockQuestion, isAnswered: () => false });
			const result = section.getStatus(mockJourneyResponse);
			assert.strictEqual(result, SECTION_STATUS.IN_PROGRESS);
			const isComplete = section.isComplete(mockJourneyResponse);
			assert.strictEqual(isComplete, false);
		});

		it('should return COMPLETE when all required answers are given', () => {
			const mockJourneyResponse = {
				answers: {
					visitFrequently: 'Answer 1',
					anotherFieldName: 'Answer 2'
				}
			};

			const requiredQuestion = {
				fieldName: 'visitFrequently',
				isRequired: () => true,
				shouldDisplay: () => true,
				isAnswered: () => true
			};

			const anotherRequiredQuestion = {
				fieldName: 'anotherFieldName',
				isRequired: () => true,
				shouldDisplay: () => true,
				isAnswered: () => true
			};

			const notARequiredQuestion = {
				fieldName: 'someQuestion',
				isRequired: () => false,
				shouldDisplay: () => true,
				isAnswered: () => false
			};

			const section = new Section('s1', 'S');
			section.addQuestion(requiredQuestion);
			section.addQuestion(anotherRequiredQuestion);
			section.addQuestion(notARequiredQuestion);

			const result = section.getStatus(mockJourneyResponse);
			assert.strictEqual(result, SECTION_STATUS.COMPLETE);
			const isComplete = section.isComplete(mockJourneyResponse);
			assert.strictEqual(isComplete, true);
		});
	});
	it('should return COMPLETE when a file upload question has files associated with it', () => {
		const mockJourneyResponse = {
			answers: {
				visitFrequently: 'Answer 1',
				anotherFieldName: 'yes',
				SubmissionDocumentUpload: [
					{
						type: 'testDocType'
					}
				]
			}
		};

		const requiredQuestion = {
			fieldName: 'visitFrequently',
			isRequired: () => true,
			shouldDisplay: () => true,
			isAnswered: () => true
		};

		const anotherRequiredQuestion = {
			fieldName: 'anotherFieldName',
			documentType: {
				name: 'testDocType'
			},
			isRequired: () => true,
			shouldDisplay: () => true,
			isAnswered: () => true
		};

		const notARequiredQuestion = {
			fieldName: 'someQuestion',
			isRequired: () => false,
			shouldDisplay: () => true,
			isAnswered: () => false
		};

		const section = new Section('s1', 'S');
		section.addQuestion(requiredQuestion);
		section.addQuestion(anotherRequiredQuestion);
		section.addQuestion(notARequiredQuestion);

		const result = section.getStatus(mockJourneyResponse);
		assert.strictEqual(result, SECTION_STATUS.COMPLETE);
		const isComplete = section.isComplete(mockJourneyResponse);
		assert.strictEqual(isComplete, true);
	});
	it('should not return COMPLETE when a file upload question has no files associated with it', () => {
		const mockJourneyResponse = {
			answers: {
				visitFrequently: 'Answer 1',
				anotherFieldName: 'yes',
				SubmissionDocumentUpload: [
					{
						type: 'notTestDocType'
					}
				]
			}
		};

		const requiredQuestion = {
			fieldName: 'visitFrequently',
			isRequired: () => true,
			shouldDisplay: () => true,
			isAnswered: () => true
		};

		const anotherRequiredQuestion = {
			fieldName: 'anotherFieldName',
			isRequired: () => true,
			documentType: {
				name: 'testDocType'
			},
			shouldDisplay: () => true,
			isAnswered: () => false
		};

		const notARequiredQuestion = {
			fieldName: 'someQuestion',
			isRequired: () => false,
			shouldDisplay: () => true,
			isAnswered: () => true
		};

		const section = new Section('s1', 'S');
		section.addQuestion(requiredQuestion);
		section.addQuestion(anotherRequiredQuestion);
		section.addQuestion(notARequiredQuestion);

		const result = section.getStatus(mockJourneyResponse);
		assert.notStrictEqual(result, SECTION_STATUS.COMPLETE);
		const isComplete = section.isComplete(mockJourneyResponse);
		assert.strictEqual(isComplete, false);
	});
	it('should do a noop', () => {
		const section = new Section('s1', 'S');
		const question = {
			title: 'ice breaker',
			question: 'Do you come here often?',
			description: 'Chit chat',
			type: 'Boolean',
			fieldName: 'visitFrequently',
			shouldDisplay: () => true
		};
		section.addQuestion(question);
		section.withCondition(() => true);
		assert.strictEqual(section.questions.length, 1);
		assert.strictEqual(section.questions[0], question);
	});

	describe('withCondition', () => {
		it('should return self from withCondition method as a fluent api', () => {
			const section = new Section('s1', 'S');
			section.addQuestion(mockQuestion);
			const result = section.withCondition(() => false);
			assert.strictEqual(result instanceof Section, true);
			assert.strictEqual(result, section);
		});

		it('should remove a question', () => {
			const section = new Section('s1', 'S');
			section.addQuestion(mockQuestion);
			section.withCondition(() => false);
			assert.strictEqual(section.questions[0].shouldDisplay(), false);
		});

		it('should not allow two conditions in a row', () => {
			const section = new Section('s1', 'S');
			section.addQuestion(mockQuestion);
			section.withCondition(() => false);
			assert.throws(() => section.withCondition(() => false));
		});

		it('should allow alternating questions & conditions', () => {
			const section = new Section('s1', 'S');
			section
				.addQuestion({ ...mockQuestion })
				.withCondition(() => false)
				.addQuestion({ ...mockQuestion })
				.withCondition(() => true)
				.addQuestion({ ...mockQuestion })
				.withCondition(() => true)
				.addQuestion({ ...mockQuestion })
				.withCondition(() => true)
				.addQuestion({ ...mockQuestion })
				.withCondition(() => true)
				.addQuestion({ ...mockQuestion })
				.withCondition(() => false);
			assert.strictEqual(section.questions[0].shouldDisplay(), false);
			assert.strictEqual(section.questions[1].shouldDisplay(), true);
			assert.strictEqual(section.questions[2].shouldDisplay(), true);
			assert.strictEqual(section.questions[3].shouldDisplay(), true);
			assert.strictEqual(section.questions[4].shouldDisplay(), true);
			assert.strictEqual(section.questions[5].shouldDisplay(), false);
		});
	});
});
