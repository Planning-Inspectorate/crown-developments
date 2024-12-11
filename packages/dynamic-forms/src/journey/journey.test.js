import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Journey } from './journey.js';

const mockSections = [
	{
		segment: 'section1',
		questions: [
			{ fieldName: 'question1', text: 'Question 1', shouldDisplay: () => true },
			{
				fieldName: 'question2',
				text: 'Question 2',
				prepQuestionForRendering: mock.fn(),
				shouldDisplay: () => true
			},
			{ fieldName: 'question3', text: 'Question 3', shouldDisplay: () => true },
			{ fieldName: 'question4', text: 'Question 4', shouldDisplay: () => true }
		]
	},
	{
		segment: 'section2',
		questions: [
			{ fieldName: 'question3', text: 'Question 3', shouldDisplay: () => true },
			{ fieldName: 'question4', text: 'Question 4', shouldDisplay: () => true }
		]
	},
	{
		segment: 'section3',
		questions: [
			{ fieldName: 'question5', text: 'Question 5', shouldDisplay: () => true },
			{ fieldName: 'question6', text: 'Question 6', shouldDisplay: () => true },
			{
				fieldName: 'question7',
				text: 'Question 7',
				url: 'q7_alternative_url',
				shouldDisplay: () => true
			},
			{ fieldName: 'question8', text: 'Question 8', shouldDisplay: () => true },
			{ fieldName: 'question9', text: 'Question 9', shouldDisplay: () => true }
		]
	}
];

describe('Journey class', () => {
	let constructorArgs;

	beforeEach(() => {
		constructorArgs = {
			journeyId: 'TEST',
			makeBaseUrl: () => 'base',
			taskListUrl: 'task-list',
			response: {
				answers: {}
			},
			journeyTemplate: 'mock template',
			listingPageViewPath: 'mock path',
			journeyTitle: 'mock title'
		};
	});

	describe('constructor', () => {
		it('should throw if no arguments passed into constructor', () => {
			assert.throws(() => new Journey({}), Error);
		});

		it('should set response when passed into constructor', () => {
			constructorArgs.response = { a: 1 };
			const journey = new Journey(constructorArgs);
			assert.strictEqual(journey.response, constructorArgs.response);
		});

		it('should error if baseUrl is not a string', () => {
			constructorArgs.makeBaseUrl = () => ({
				a: 1
			});
			assert.throws(() => new Journey(constructorArgs), new Error('baseUrl should be a string.'));
		});

		it('should set baseUrl', () => {
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.baseUrl, constructorArgs.makeBaseUrl());
		});

		it('should remove trailing / to baseUrl', () => {
			constructorArgs.makeBaseUrl = () => '/abc/';
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.baseUrl, '/abc');
		});

		it('should set taskListUrl', () => {
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.taskListUrl, constructorArgs.makeBaseUrl() + '/' + constructorArgs.taskListUrl);
		});

		it('should set journeyTemplate', () => {
			constructorArgs.journeyTemplate = 'test';
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.journeyTemplate, constructorArgs.journeyTemplate);
		});

		it('should error if journeyTemplate not provided', () => {
			constructorArgs.journeyTemplate = '';

			assert.throws(() => new Journey(constructorArgs), new Error('journeyTemplate should be a string.'));
		});

		it('should error if journeyTemplate not a string', () => {
			constructorArgs.journeyTemplate = [true, 123, 'test'];

			assert.throws(() => new Journey(constructorArgs), new Error('journeyTemplate should be a string.'));
		});

		it('should set listingPageViewPath', () => {
			constructorArgs.listingPageViewPath = 'test';
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.listingPageViewPath, constructorArgs.listingPageViewPath);
		});

		it('should error if listingPageViewPath not provided', () => {
			constructorArgs.listingPageViewPath = '';

			assert.throws(() => new Journey(constructorArgs), new Error('listingPageViewPath should be a string.'));
		});

		it('should error if listingPageViewPath not a string', () => {
			constructorArgs.listingPageViewPath = 123;

			assert.throws(() => new Journey(constructorArgs), new Error('listingPageViewPath should be a string.'));
		});

		it('should set journeyTitle', () => {
			constructorArgs.journeyTitle = 'test';
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.journeyTitle, constructorArgs.journeyTitle);
		});

		it('should error if journeyTitle not provided', () => {
			constructorArgs.journeyTitle = '';

			assert.throws(() => new Journey(constructorArgs), new Error('journeyTitle should be a string.'));
		});

		it('should error if journeyTitle not a string', () => {
			constructorArgs.journeyTitle = true;

			assert.throws(() => new Journey(constructorArgs), new Error('journeyTitle should be a string.'));
		});

		it('should set returnToListing - true', () => {
			constructorArgs.returnToListing = true;
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.returnToListing, true);
		});

		it('should set returnToListing - false', () => {
			constructorArgs.returnToListing = false;
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.returnToListing, false);
		});

		it('should handle returnToListing not defined', () => {
			const journey = new Journey(constructorArgs);

			assert.strictEqual(journey.returnToListing, false);
		});
	});

	describe('getSection', () => {
		it('should return the correct section by section segment', () => {
			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const question = journey.getSection(mockSections[0].segment);

			assert.strictEqual(question, mockSections[0]);
		});

		it('should return undefined if section is not found', () => {
			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const section = journey.getSection('a', 'b');

			assert.strictEqual(section, undefined);
		});
	});

	describe('getQuestionBySectionAndName', () => {
		it('should return the correct question by section and name', () => {
			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const question = journey.getQuestionBySectionAndName(
				mockSections[0].segment,
				mockSections[0].questions[1].fieldName
			);

			assert.strictEqual(question, mockSections[0].questions[1]);
		});

		it('should return undefined if section is not found', () => {
			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const question = journey.getQuestionBySectionAndName('a', 'b');

			assert.strictEqual(question, undefined);
		});

		it('should return undefined if question is not found', () => {
			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const question = journey.getQuestionBySectionAndName(mockSections[0].segment, 'nope');

			assert.strictEqual(question, undefined);
		});
	});

	describe('getNextQuestionUrl', () => {
		for (const returnToListing of [true, false]) {
			it(`should return the baseUrl if section is not found [${returnToListing}]`, () => {
				const section = 'section3'; // Non-existent section
				const name = mockSections[0].questions[0].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = returnToListing;

				const nextQuestionUrl = journey.getNextQuestionUrl(section, name, false);

				assert.strictEqual(nextQuestionUrl, journey.taskListUrl);
			});
		}

		for (const returnToListing of [true, false]) {
			it(`should return the baseUrl if section is not found [${returnToListing}]`, () => {
				const section = mockSections[0].segment;
				const name = 'nope'; // Non-existent question

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = returnToListing;

				const nextQuestionUrl = journey.getNextQuestionUrl(section, name, false);

				assert.strictEqual(nextQuestionUrl, journey.taskListUrl);
			});
		}

		for (const returnToListing of [true, false]) {
			it(`should use the question url prop if provided[${returnToListing}]`, () => {
				const section = mockSections[2];
				const name = section.questions[1].fieldName;
				const nextQuestionName = section.questions[2].url;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = returnToListing;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, false);

				assert.strictEqual(nextQuestionUrl, `${constructorArgs.makeBaseUrl()}/${section.segment}/${nextQuestionName}`);
			});
		}

		const tests = [
			[0, true],
			[1, true],
			[2, true],
			[0, false],
			[1, false],
			[2, false]
		];

		for (const [currentSectionIndex, returnToListing] of tests) {
			it(`should return the url for the next question in the current section ${currentSectionIndex} ${returnToListing}`, () => {
				const section = mockSections[currentSectionIndex];
				const name = section.questions[0].fieldName;
				const nextQuestionName = section.questions[1].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = returnToListing;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, false);

				assert.strictEqual(nextQuestionUrl, `${constructorArgs.makeBaseUrl()}/${section.segment}/${nextQuestionName}`);
			});
		}

		for (const [currentSectionIndex, returnToListing] of tests) {
			it(`should return the previous question url in current section ${currentSectionIndex} if reversed ${returnToListing}`, () => {
				const section = mockSections[currentSectionIndex];
				const name = section.questions[1].fieldName;
				const prevQuestionName = section.questions[0].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = returnToListing;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, true);

				assert.strictEqual(nextQuestionUrl, `${constructorArgs.makeBaseUrl()}/${section.segment}/${prevQuestionName}`);
			});
		}

		for (const returnToListing of [true, false]) {
			it(`should return the baseUrl if there is no next section ${returnToListing}`, () => {
				const section = mockSections[mockSections.length - 1];
				const name = section.questions[section.questions.length - 1].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = returnToListing;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, false);

				assert.strictEqual(nextQuestionUrl, journey.taskListUrl);
			});
		}

		for (const currentSectionIndex of [1, 2]) {
			it(`should return the previous question if there is one in the previous section ${currentSectionIndex} - 1`, () => {
				const section = mockSections[currentSectionIndex];
				const name = section.questions[0].fieldName;
				const prevSection = mockSections[currentSectionIndex - 1];
				const prevQuestionName = prevSection.questions[prevSection.questions.length - 1].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = false;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, true);

				assert.strictEqual(
					nextQuestionUrl,
					`${constructorArgs.makeBaseUrl()}/${prevSection.segment}/${prevQuestionName}`
				);
			});
		}

		for (const returnToListing of [true, false]) {
			it(`should return the baseUrl if there is no previous section ${returnToListing}`, () => {
				const section = mockSections[0];
				const name = section.questions[0].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = returnToListing;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, true);

				assert.strictEqual(nextQuestionUrl, journey.taskListUrl);
			});
		}

		for (const currentSectionIndex of [0, 1, 2]) {
			it(`should return the baseUrl if at end of section ${currentSectionIndex} and returnToListing is true`, () => {
				const section = mockSections[currentSectionIndex];
				const name = section.questions[section.questions.length - 1].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = true;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, false);
				assert.strictEqual(nextQuestionUrl, journey.taskListUrl);
			});
		}

		for (const currentSectionIndex of [0, 1, 2]) {
			it(`should return the baseUrl if at start of section ${currentSectionIndex} and returnToListing is true`, () => {
				const section = mockSections[currentSectionIndex];
				const name = section.questions[0].fieldName;

				const journey = new Journey(constructorArgs);
				journey.sections = mockSections;
				journey.returnToListing = true;

				const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, true);

				assert.strictEqual(nextQuestionUrl, journey.taskListUrl);
			});
		}

		it('should handle querystring in baseUrl', () => {
			constructorArgs.makeBaseUrl = () => 'base?id=1';
			const section = mockSections[2];
			const name = section.questions[1].fieldName;
			const nextQuestionName = section.questions[2].url;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const nextQuestionUrl = journey.getNextQuestionUrl(section.segment, name, false);

			assert.strictEqual(nextQuestionUrl, `base/${section.segment}/${nextQuestionName}?id=1`);
		});
	});

	describe('getCurrentQuestionUrl', () => {
		it('should return the current question URL if found', () => {
			const section = mockSections[0].segment;
			const name = mockSections[0].questions[1].fieldName;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.getCurrentQuestionUrl(section, name);

			assert.strictEqual(currentQuestionUrl, `${constructorArgs.makeBaseUrl()}/${section}/${name}`);
		});

		it('should return the questionnaire URL if section or question is not found', () => {
			const section = 'nope';
			const name = mockSections[0].questions[1].fieldName;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.getCurrentQuestionUrl(section, name);

			assert.strictEqual(currentQuestionUrl, journey.taskListUrl);
		});

		it('should return the current question URL using url slug if set', () => {
			const section = mockSections[2].segment;
			const name = mockSections[2].questions[2].url;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.getCurrentQuestionUrl(section, name);

			assert.strictEqual(currentQuestionUrl, `${constructorArgs.makeBaseUrl()}/${section}/${name}`);
		});

		it('should handle querystring in baseUrl', () => {
			constructorArgs.makeBaseUrl = () => 'base?id=1';
			const section = mockSections[0].segment;
			const name = mockSections[0].questions[1].fieldName;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.getCurrentQuestionUrl(section, name);

			assert.strictEqual(currentQuestionUrl, `base/${section}/${name}?id=1`);
		});
	});

	describe('isComplete', () => {
		it('should return true for isComplete when all sections are complete', () => {
			const completeSectionStubs = [
				{
					isComplete() {
						return true;
					}
				},
				{
					isComplete() {
						return true;
					}
				},
				{
					isComplete() {
						return true;
					}
				}
			];
			const journey = new Journey(constructorArgs);
			journey.sections = completeSectionStubs;
			assert.strictEqual(journey.isComplete(), true);
		});

		it('should return false for isComplete when one section is incomplete', () => {
			const oneIncompleteSectionStubs = [
				{
					isComplete() {
						return false;
					}
				},
				{
					isComplete() {
						return true;
					}
				},
				{
					isComplete() {
						return true;
					}
				}
			];
			const journey = new Journey(constructorArgs);
			journey.sections = oneIncompleteSectionStubs;
			assert.strictEqual(journey.isComplete(), false);
		});

		it('should return false for isComplete when all sections are incomplete', () => {
			const oneIncompleteSectionStubs = [
				{
					isComplete() {
						return false;
					}
				},
				{
					isComplete() {
						return false;
					}
				},
				{
					isComplete() {
						return false;
					}
				}
			];
			const journey = new Journey(constructorArgs);
			journey.sections = oneIncompleteSectionStubs;
			assert.strictEqual(journey.isComplete(), false);
		});
	});

	describe('addToCurrentQuestionUrl', () => {
		it('should return the current question URL if found', () => {
			const section = mockSections[0].segment;
			const name = mockSections[0].questions[1].fieldName;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.addToCurrentQuestionUrl(section, name, '/add');

			assert.strictEqual(currentQuestionUrl, `${constructorArgs.makeBaseUrl()}/${section}/${name}/add`);
		});

		it('should return the questionnaire URL if section or question is not found', () => {
			const section = 'nope';
			const name = mockSections[0].questions[1].fieldName;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.addToCurrentQuestionUrl(section, name, '/add');

			assert.strictEqual(currentQuestionUrl, journey.taskListUrl);
		});

		it('should return the current question URL using url slug if set', () => {
			const section = mockSections[2].segment;
			const name = mockSections[2].questions[2].url;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.addToCurrentQuestionUrl(section, name, '/add');

			assert.strictEqual(currentQuestionUrl, `${constructorArgs.makeBaseUrl()}/${section}/${name}/add`);
		});

		it('should handle querystring in baseUrl', () => {
			constructorArgs.makeBaseUrl = () => 'base?id=1';
			const section = mockSections[0].segment;
			const name = mockSections[0].questions[1].fieldName;

			const journey = new Journey(constructorArgs);
			journey.sections = mockSections;

			const currentQuestionUrl = journey.addToCurrentQuestionUrl(section, name, '/add');

			assert.strictEqual(currentQuestionUrl, `base/${section}/${name}/add?id=1`);
		});
	});
});
