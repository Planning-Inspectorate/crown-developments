import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { Section, SECTION_STATUS } from './section.js';
import RequiredValidator from './validator/required-validator.js';

const mockQuestion = {
	fieldName: 'visitFrequently',
	isRequired: () => true,
	shouldDisplay: () => true,
	isAnswered: () => false
};

const mockQuestion2 = {
	fieldName: 'visitRarely',
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
			const result = section.addQuestion({ ...mockQuestion });
			assert.strictEqual(result instanceof Section, true);
			assert.strictEqual(result, section);
		});

		it('should add a question', () => {
			const section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion });
			assert.strictEqual(section.questions.length, 1);
			const question = section.questions[0];
			assert.strictEqual(question.fieldName, mockQuestion.fieldName);
			assert.strictEqual(question.isAnswered, mockQuestion.isAnswered);
			assert.strictEqual(question.isRequired, mockQuestion.isRequired);
			assert.strictEqual(question.shouldDisplay(), mockQuestion.shouldDisplay());
		});
	});

	describe('getStatus', () => {
		it('should return NOT_STARTED when no answers are given', () => {
			const mockJourneyResponse = {
				answers: {}
			};
			const section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion });
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
			section.addQuestion({ ...mockQuestion });
			const result = section.withCondition(() => false);
			assert.strictEqual(result instanceof Section, true);
			assert.strictEqual(result, section);
		});

		it('should remove a question', () => {
			const section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion });
			section.withCondition(() => false);
			assert.strictEqual(section.questions[0].shouldDisplay(), false);
		});

		it('should not allow two conditions in a row', () => {
			const section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion });
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
	describe('withSectionCondition', () => {
		it('should return self as a fluent api', () => {
			const section = new Section('s1', 'S');
			const result = section.withSectionCondition(() => false);
			assert.strictEqual(result instanceof Section, true);
			assert.strictEqual(result, section);
		});

		it('should check withSectionCondition is called first', () => {
			const section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion });
			assert.throws(() => section.withSectionCondition(() => false), {
				message: 'section conditions must be added before any questions'
			});
		});

		it('should check withSectionCondition is called with a function', () => {
			const section = new Section('s1', 'S');
			assert.throws(() => section.withSectionCondition(false), {
				message: 'section condition must be a function'
			});
		});

		it('should check withSectionCondition is called only once', () => {
			const section = new Section('s1', 'S');
			section.withSectionCondition(() => true);
			assert.throws(() => section.withSectionCondition(() => false), {
				message: 'section condition already set'
			});
		});

		it('should add condition to all questions', () => {
			// without condition to check first
			let section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion });
			section.addQuestion({ ...mockQuestion2 });
			for (const q of section.questions) {
				assert.strictEqual(q.shouldDisplay(), true);
			}

			section = new Section('s1', 'S');
			section.withSectionCondition(() => false);
			section.addQuestion({ ...mockQuestion });
			section.addQuestion({ ...mockQuestion2 });
			for (const q of section.questions) {
				assert.strictEqual(q.shouldDisplay(), false);
			}
		});
	});
	describe('withMultiQuestionCondition', () => {
		it('should return self as a fluent api', () => {
			const section = new Section('s1', 'S');
			let result = section.startMultiQuestionCondition('group-1', () => false);
			assert.strictEqual(result instanceof Section, true);
			assert.strictEqual(result, section);
			result = section.endMultiQuestionCondition('group-1');
			assert.strictEqual(result instanceof Section, true);
			assert.strictEqual(result, section);
		});

		it('should check conditionName is not repeated', () => {
			const section = new Section('s1', 'S');
			section.startMultiQuestionCondition('group-1', () => false).addQuestion({ ...mockQuestion });
			assert.throws(() => section.startMultiQuestionCondition('group-1', () => false), {
				message: 'group condition already started'
			});
		});

		it('should check conditionName has been started', () => {
			const section = new Section('s1', 'S');
			section.addQuestion({ ...mockQuestion });
			assert.throws(() => section.endMultiQuestionCondition('group-1'), {
				message: 'group condition not started'
			});
		});

		it('should add condition to all questions until end', () => {
			const section = new Section('s1', 'S');
			const mockCondition = mock.fn(() => true);
			section
				.startMultiQuestionCondition('group-1', mockCondition)
				.addQuestion({ ...mockQuestion })
				.addQuestion({ ...mockQuestion })
				.addQuestion({ ...mockQuestion })
				.endMultiQuestionCondition('group-1')
				.addQuestion({ ...mockQuestion })
				.addQuestion({ ...mockQuestion });

			assert.strictEqual(section.questions.length, 5);
			assert.strictEqual(mockCondition.mock.callCount(), 0);
			for (const q of section.questions) {
				q.shouldDisplay();
			}
			assert.strictEqual(mockCondition.mock.callCount(), 3);
		});

		it('should add conditions for multiple groups', () => {
			const section = new Section('s1', 'S');
			const mockCondition1 = mock.fn(() => true);
			const mockCondition2 = mock.fn(() => true);
			const mockCondition3 = mock.fn(() => true);
			section
				.startMultiQuestionCondition('group-1', mockCondition1)
				.addQuestion({ ...mockQuestion })
				.startMultiQuestionCondition('group-2', mockCondition2)
				.addQuestion({ ...mockQuestion })
				.endMultiQuestionCondition('group-2')
				.startMultiQuestionCondition('group-3', mockCondition3)
				.addQuestion({ ...mockQuestion })
				.endMultiQuestionCondition('group-1')
				.addQuestion({ ...mockQuestion })
				.endMultiQuestionCondition('group-3')
				.addQuestion({ ...mockQuestion });

			assert.strictEqual(section.questions.length, 5);
			assert.strictEqual(mockCondition1.mock.callCount(), 0);
			assert.strictEqual(mockCondition2.mock.callCount(), 0);
			assert.strictEqual(mockCondition3.mock.callCount(), 0);

			const conditionsCounts = [
				[1, 0, 0], // first q - just group-1
				[1, 1, 0], // second q - group-1 and group-2
				[1, 0, 1], // third q - group-1 and group-3
				[0, 0, 1], // fourth q - just group-3
				[0, 0, 0] // fifth q - no groups
			];

			for (let i = 0; i < 5; i++) {
				const [group1, group2, group3] = conditionsCounts[i];
				mockCondition1.mock.resetCalls();
				mockCondition2.mock.resetCalls();
				mockCondition3.mock.resetCalls();
				section.questions[i].shouldDisplay();
				assert.strictEqual(mockCondition1.mock.callCount(), group1);
				assert.strictEqual(mockCondition2.mock.callCount(), group2);
				assert.strictEqual(mockCondition3.mock.callCount(), group3);
			}
		});
	});
	describe('conditions', () => {
		it('should combine section condition with question condition', () => {
			const section = new Section('s1', 'S');
			const mockSectionCondition = mock.fn(() => true);
			const mockQuestionCondition = mock.fn(() => true);
			const mockQuestion2Condition = mock.fn(() => false);

			section
				.withSectionCondition(mockSectionCondition)
				.addQuestion({ ...mockQuestion })
				.withCondition(mockQuestionCondition)
				.addQuestion({ ...mockQuestion })
				.addQuestion({ ...mockQuestion })
				.withCondition(mockQuestion2Condition)
				.addQuestion({ ...mockQuestion });
			assert.strictEqual(section.questions.length, 4);

			assert.strictEqual(section.questions[0].shouldDisplay(), true);
			assert.strictEqual(section.questions[1].shouldDisplay(), true);
			assert.strictEqual(section.questions[2].shouldDisplay(), false);
			assert.strictEqual(section.questions[3].shouldDisplay(), true);
			assert.strictEqual(mockSectionCondition.mock.callCount(), 4);
			assert.strictEqual(mockQuestionCondition.mock.callCount(), 1);
			assert.strictEqual(mockQuestionCondition.mock.callCount(), 1);

			mockSectionCondition.mock.mockImplementation(() => false);
			assert.strictEqual(section.questions[0].shouldDisplay(), false);
			assert.strictEqual(section.questions[1].shouldDisplay(), false);
			assert.strictEqual(section.questions[2].shouldDisplay(), false);
			assert.strictEqual(section.questions[3].shouldDisplay(), false);
			assert.strictEqual(mockSectionCondition.mock.callCount(), 8);
			assert.strictEqual(mockQuestionCondition.mock.callCount(), 1);
			assert.strictEqual(mockQuestionCondition.mock.callCount(), 1);
		});

		it('should combine section, multi, and question conditions', () => {
			const conditions = {
				section: mock.fn(() => true),
				group1: mock.fn(() => true),
				group2: mock.fn(() => true),
				group3: mock.fn(() => true),
				question1: mock.fn(() => true),
				question2: mock.fn(() => true)
			};

			const section = new Section('s1', 'S');
			section
				.withSectionCondition(conditions.section)
				.startMultiQuestionCondition('group-1', conditions.group1)
				.addQuestion({ ...mockQuestion })
				.withCondition(conditions.question1)
				.startMultiQuestionCondition('group-2', conditions.group2)
				.addQuestion({ ...mockQuestion })
				.withCondition(conditions.question2)
				.endMultiQuestionCondition('group-2')
				.startMultiQuestionCondition('group-3', conditions.group3)
				.addQuestion({ ...mockQuestion })
				.endMultiQuestionCondition('group-1')
				.addQuestion({ ...mockQuestion })
				.endMultiQuestionCondition('group-3')
				.addQuestion({ ...mockQuestion });

			assert.strictEqual(section.questions.length, 5);
			for (const condition of Object.values(conditions)) {
				assert.strictEqual(condition.mock.callCount(), 0);
			}

			const conditionCounts = [
				{ group1: 1, question1: 1 },
				{ group1: 1, group2: 1, question2: 1 },
				{ group1: 1, group3: 1 },
				{ group3: 1 },
				{}
			];

			for (let i = 0; i < 5; i++) {
				const { group1 = 0, group2 = 0, group3 = 0, question1 = 0, question2 = 0 } = conditionCounts[i];

				for (const condition of Object.values(conditions)) {
					condition.mock.resetCalls();
				}

				section.questions[i].shouldDisplay();

				assert.strictEqual(conditions.section.mock.callCount(), 1);
				assert.strictEqual(conditions.group1.mock.callCount(), group1);
				assert.strictEqual(conditions.group2.mock.callCount(), group2);
				assert.strictEqual(conditions.group3.mock.callCount(), group3);
				assert.strictEqual(conditions.question1.mock.callCount(), question1);
				assert.strictEqual(conditions.question2.mock.callCount(), question2);
			}

			// q 1 should not show if section, group1, or question1 condition is false
			const q1 = section.questions[0];
			conditions.section.mock.mockImplementationOnce(() => false);
			assert.strictEqual(q1.shouldDisplay(), false);
			conditions.group1.mock.mockImplementationOnce(() => false);
			assert.strictEqual(q1.shouldDisplay(), false);
			conditions.question1.mock.mockImplementationOnce(() => false);
			assert.strictEqual(q1.shouldDisplay(), false);
			// otherwise it should show
			assert.strictEqual(q1.shouldDisplay(), true);
		});
	});

	describe('isFieldMandatory', () => {
		it('should add a RequiredValidator when isQuestionMandatory is true', () => {
			const section = new Section('s1', 'S');
			section.questions.push({ validators: [] });

			section.withRequiredCondition(true, 'Field is required');

			assert.strictEqual(section.questions[0].validators.length, 1);
			assert(section.questions[0].validators[0] instanceof RequiredValidator);
			assert.strictEqual(section.questions[0].validators[0].errorMessage, 'Field is required');
		});

		it('should not add a duplicate RequiredValidator if one already exists', () => {
			const section = new Section('s1', 'S');
			section.questions.push({ validators: [new RequiredValidator('Field is required')] });

			section.withRequiredCondition(true, 'Field is required');

			assert.strictEqual(section.questions[0].validators.length, 1);
		});

		it('should remove RequiredValidator when isQuestionMandatory is false', () => {
			const section = new Section('s1', 'S');
			section.questions.push({ validators: [new RequiredValidator('Field is required')] });

			section.withRequiredCondition(false);

			assert.strictEqual(section.questions[0].validators.length, 0);
		});

		it('should do nothing if there are no RequiredValidator instances and isQuestionMandatory is false', () => {
			const section = new Section('s1', 'S');
			section.questions.push({ validators: [] });

			section.withRequiredCondition(false);

			assert.strictEqual(section.questions[0].validators.length, 0);
		});

		it('should not modify existing non-RequiredValidator validators', () => {
			const section = new Section('s1', 'S');
			const customValidator = { validate: () => true };
			section.questions.push({ validators: [customValidator] });

			section.withRequiredCondition(false);

			assert.strictEqual(section.questions[0].validators.length, 1);
			assert.strictEqual(section.questions[0].validators[0], customValidator);
		});

		it('should not allow two required conditions in a row', () => {
			const section = new Section('s1', 'S');
			const customValidator = { validate: () => true };
			section.questions.push({ validators: [customValidator] });
			section.withRequiredCondition(false);
			assert.throws(() => section.withRequiredCondition(false));
		});
	});
});
