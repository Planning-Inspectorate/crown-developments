import { describe, it } from 'node:test';
import assert from 'node:assert';
import { JourneyResponse } from '@planning-inspectorate/dynamic-forms/src/journey/journey-response.js';
import { getQuestions } from './questions.js';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';
import { Journey } from '@planning-inspectorate/dynamic-forms/src/journey/journey.js';
import { addRepresentationSection, haveYourSayManageSections, haveYourSaySections } from './sections.js';

describe('have-your-say', () => {
	describe('have-your-say manage sections', () => {
		const JOURNEY_ID = 'have-your-say-1';

		it('all questions should be defined for view journey', () => {
			const questions = getQuestions();
			const answers = {};
			const createJourney = (questions, response, req) => {
				return new Journey({
					journeyId: JOURNEY_ID,
					sections: haveYourSayManageSections(questions, true, true),
					makeBaseUrl: () => req.baseUrl,
					journeyTemplate: 'template.njk',
					taskListTemplate: 'template-2.njk',
					journeyTitle: 'Have your say',
					response
				});
			};
			const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
			const journey = createJourney(questions, response, {
				baseUrl: `/some/path/${JOURNEY_ID}`,
				params: { applicationId: 'CROWN123' }
			});
			const sections = journey.sections;

			assert.strictEqual(sections.length, 5);
			sections.forEach((section) => section.questions.forEach((q) => assert.ok(q !== undefined)));
		});

		it('all questions should be defined for review journey', () => {
			const questions = getQuestions();
			const answers = {};
			const createJourney = (questions, response, req) => {
				return new Journey({
					journeyId: JOURNEY_ID,
					sections: haveYourSayManageSections(questions, true, false),
					makeBaseUrl: () => req.baseUrl,
					journeyTemplate: 'template.njk',
					taskListTemplate: 'template-2.njk',
					journeyTitle: 'Have your say',
					response
				});
			};
			const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
			const journey = createJourney(questions, response, {
				baseUrl: `/some/path/${JOURNEY_ID}`,
				params: { applicationId: 'CROWN123' }
			});
			const sections = journey.sections;

			assert.strictEqual(sections.length, 5);
			sections.forEach((section) => section.questions.forEach((q) => assert.ok(q !== undefined)));
		});
	});
	describe('have-your-say section', () => {
		const JOURNEY_ID = 'have-your-say-1';
		const createJourney = (questions, response, req, isRepsUploadDocsLive = true) => {
			return new Journey({
				journeyId: JOURNEY_ID,
				sections: haveYourSaySections(questions, isRepsUploadDocsLive),
				makeBaseUrl: () => req.baseUrl,
				journeyTemplate: 'template.njk',
				taskListTemplate: 'template-2.njk',
				journeyTitle: 'Have your say',
				response
			});
		};

		it('all questions should be defined', () => {
			const questions = getQuestions();
			const answers = {};
			const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
			const journey = createJourney(questions, response, {
				baseUrl: `/some/path/${JOURNEY_ID}`,
				params: { applicationId: 'CROWN123' }
			});
			const sections = journey.sections;

			assert.strictEqual(sections.length, 3);
			sections.forEach((section) => section.questions.forEach((q) => assert.ok(q !== undefined)));
		});

		it('should include all questions for have your say myself journey', () => {
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				myselfContainsAttachments: BOOLEAN_OPTIONS.YES
			};

			testHaveYourSayQuestionsDisplay(answers, [], true);
		});

		it('should include all questions for have your say on behalf of person journey', () => {
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				isAgent: BOOLEAN_OPTIONS.YES,
				submitterContainsAttachments: BOOLEAN_OPTIONS.YES
			};
			const expectedQuestions = [
				'representedTypeId',
				'submitterFullName',
				'isAgent',
				'agentOrgName',
				'submitterEmail',
				'representedFullName',
				'submitterComment',
				'submitterContainsAttachments',
				'submitterAttachments'
			];

			testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
		});

		it('should include all questions for have your say on behalf of org/charity journey', () => {
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				submitterContainsAttachments: BOOLEAN_OPTIONS.YES
			};
			const expectedQuestions = [
				'representedTypeId',
				'submitterFullName',
				'submitterEmail',
				'orgName',
				'orgRoleName',
				'submitterComment',
				'submitterContainsAttachments',
				'submitterAttachments'
			];

			testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
		});

		it('should include all questions for have your say on behalf of org/charity not work for journey', () => {
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				isAgent: BOOLEAN_OPTIONS.YES,
				submitterContainsAttachments: BOOLEAN_OPTIONS.YES
			};
			const expectedQuestions = [
				'representedTypeId',
				'submitterFullName',
				'isAgent',
				'agentOrgName',
				'submitterEmail',
				'representedOrgName',
				'submitterComment',
				'submitterContainsAttachments',
				'submitterAttachments'
			];

			testHaveYourSayQuestionsDisplay(answers, expectedQuestions, false);
		});

		it('isComplete should return true if Representation and Myself sections completed', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				myselfFirstName: 'Test Name',
				myselfLastName: 'Test Last',
				myselfEmail: 'test@email.com',
				myselfComment: 'some comments',
				myselfContainsAttachments: BOOLEAN_OPTIONS.NO
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), true);
		});

		it('isComplete should return false if Myself section incomplete', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				myselfFirstName: 'FirstName',
				myselfLastName: 'LastName',
				myselfComment: 'test@email.com'
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), false);
		});

		it('isComplete should return true if on behalf of person journey completed', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterFirstName: 'Agent Name',
				submitterLastName: 'Test Last',
				isAgent: BOOLEAN_OPTIONS.YES,
				agentOrgName: 'Org Name',
				submitterEmail: 'test@email.com',
				representedFirstName: 'Represented Person',
				representedLastName: 'Represented Surname',
				submitterComment: 'some comments',
				submitterContainsAttachments: BOOLEAN_OPTIONS.NO
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), true);
		});

		it('isComplete should return false if on behalf of person journey incomplete', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.PERSON,
				submitterFirstName: 'Agent',
				submitterLastName: 'Name',
				isAgent: BOOLEAN_OPTIONS.YES,
				agentOrgName: 'Org Name',
				submitterEmail: 'test@email.com',
				submitterComment: 'some comments'
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), false);
		});

		it('isComplete should return true if on behalf of org work for journey completed', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				submitterFirstName: 'Agent Name',
				submitterLastName: 'Test Last',
				submitterEmail: 'test@email.com',
				orgName: 'Org Name',
				orgRoleName: 'Boss',
				submitterComment: 'some comments',
				submitterContainsAttachments: BOOLEAN_OPTIONS.NO
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), true);
		});

		it('isComplete should false true if on behalf of org work for journey incomplete', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
				submitterFirstName: 'Agent Name',
				submitterLastName: 'Test Last',
				submitterEmail: 'test@email.com',
				orgName: 'Org Name',
				submitterComment: 'some comments'
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), false);
		});

		it('isComplete should return true if on behalf of org not work for journey completed', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				submitterFirstName: 'Agent Name',
				submitterLastName: 'Test Last',
				isAgent: BOOLEAN_OPTIONS.YES,
				agentOrgName: 'Test Org',
				submitterEmail: 'test@email.com',
				representedOrgName: 'Test Org Representing',
				submitterComment: 'some comments',
				submitterContainsAttachments: BOOLEAN_OPTIONS.NO
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), true);
		});

		it('isComplete should return false if on behalf of org not work for journey incomplete', () => {
			const questions = getQuestions();
			const answers = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
				submitterFirstName: 'Agent Name',
				submitterLastName: 'Test Last',
				isAgent: BOOLEAN_OPTIONS.YES,
				agentOrgName: 'Test Org',
				submitterEmail: 'test@email.com',
				submitterComment: 'some comments'
			};

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

			assert.strictEqual(journey.isComplete(), false);
		});

		const testHaveYourSayQuestionsDisplay = (answers, expectedOnBehalfOfQuestions, shouldMyselfDisplay) => {
			const questions = getQuestions();

			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
			const sections = journey.sections;

			assert.strictEqual(sections.length, 3);

			const representationSection = sections[0];
			assert.strictEqual(representationSection.questions.length, 1);

			const myselfSection = sections[1];
			assert.strictEqual(myselfSection.questions.length, 5);
			for (const myselfQuestion of myselfSection.questions) {
				assert.strictEqual(
					myselfQuestion.shouldDisplay(response),
					shouldMyselfDisplay,
					`Expected ${myselfQuestion.fieldName} to be ${shouldMyselfDisplay}`
				);
			}

			const onBehalfOfSection = sections[2];
			assert.strictEqual(onBehalfOfSection.questions.length, 13);

			for (const onBehalfOfQuestion of onBehalfOfSection.questions) {
				const expected = expectedOnBehalfOfQuestions.includes(onBehalfOfQuestion.fieldName);
				assert.strictEqual(
					onBehalfOfQuestion.shouldDisplay(response),
					expected,
					`Expected ${onBehalfOfQuestion.fieldName} to be ${expected}`
				);
			}
		};
	});
	describe('add-representation sections', () => {
		const JOURNEY_ID = 'add-representation';
		const createJourney = (questions, response, req) => {
			return new Journey({
				journeyId: JOURNEY_ID,
				sections: addRepresentationSection(questions),
				makeBaseUrl: () => req.baseUrl,
				journeyTemplate: 'template.njk',
				taskListTemplate: 'template-2.njk',
				journeyTitle: 'Add a representation',
				response
			});
		};
		it('all questions should be defined', () => {
			const questions = getQuestions();
			const answers = {};
			const response = new JourneyResponse(JOURNEY_ID, 'session-id', answers);
			const journey = createJourney(questions, response, {
				baseUrl: `/some/path/${JOURNEY_ID}`,
				params: { applicationId: 'CROWN123' }
			});
			const sections = journey.sections;

			assert.strictEqual(sections.length, 3);
			sections.forEach((section) => section.questions.forEach((q) => assert.ok(q !== undefined)));
		});
		describe('myself journey', () => {
			const defaultAnswers = () => {
				return {
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
				};
			};
			const defaultQuestions = () => [
				'myselfContactPreference',
				'myselfFullName',
				'myselfComment',
				'myselfHearingPreference'
			];
			it('should include all default questions', () => {
				const answers = defaultAnswers();

				const questions = defaultQuestions();

				testAddRepresentationQuestionsDisplay(answers, questions, []);
			});
			it('should handle contact preferences correctly', () => {
				const answers = defaultAnswers();
				const byPostQuestions = defaultQuestions().concat('myselfAddress');
				const byEmailQuestions = defaultQuestions().concat('myselfEmail');

				answers.myselfContactPreference = 'post';
				testAddRepresentationQuestionsDisplay(answers, byPostQuestions, []);

				answers.myselfContactPreference = 'email';
				testAddRepresentationQuestionsDisplay(answers, byEmailQuestions, []);
			});

			it('isComplete should return true if Representation and Myself sections are completed', () => {
				const questions = getQuestions();
				const answers = {
					submittedDate: new Date(),
					categoryId: 'consultees',
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					myselfFirstName: 'FirstName',
					myselfLastName: 'LastName',
					myselfContactPreference: 'email',
					myselfEmail: 'test@test.com',
					myselfComment: 'some comments',
					myselfHearingPreference: BOOLEAN_OPTIONS.YES
				};

				const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
				const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

				assert.strictEqual(journey.isComplete(), true);
			});
			it('isComplete should return false if Representation and Myself sections are not completed', () => {
				const questions = getQuestions();
				const answers = {
					submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
					myselfFirstName: 'FirstName',
					myselfLastName: 'LastName',
					myselfContactPreference: 'email',
					myselfEmail: 'test@test.com',
					myselfHearingPreference: BOOLEAN_OPTIONS.YES
				};

				const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
				const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

				assert.strictEqual(journey.isComplete(), false);
			});
		});
		describe('on-behalf-of journey', () => {
			describe('person', () => {
				const defaultAnswers = () => {
					return {
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.PERSON
					};
				};
				const defaultQuestions = () => [
					'representedTypeId',
					'isAgent',
					'submitterFullName',
					'representedFullName',
					'submitterComment',
					'submitterContactPreference',
					'submitterHearingPreference'
				];
				it('should include all default questions', () => {
					const answers = defaultAnswers();
					const questions = defaultQuestions();
					testAddRepresentationQuestionsDisplay(answers, [], questions);
				});

				it('should handle contactPreference correctly', () => {
					const answers = defaultAnswers();

					const byPostQuestions = defaultQuestions().concat('submitterAddress');
					const byEmailQuestions = defaultQuestions().concat('submitterEmail');

					answers.submitterContactPreference = 'post';
					testAddRepresentationQuestionsDisplay(answers, [], byPostQuestions);

					answers.submitterContactPreference = 'email';
					testAddRepresentationQuestionsDisplay(answers, [], byEmailQuestions);
				});
				it('should handle isAgent correctly', () => {
					const answers = defaultAnswers();

					const isAgentQuestions = defaultQuestions().concat('agentOrgName');
					const isNotAgentQuestions = defaultQuestions();

					answers.isAgent = BOOLEAN_OPTIONS.YES;
					testAddRepresentationQuestionsDisplay(answers, [], isAgentQuestions);

					answers.isAgent = BOOLEAN_OPTIONS.NO;
					testAddRepresentationQuestionsDisplay(answers, [], isNotAgentQuestions);
				});
				it('isComplete should return true if Representation and On Behalf Of Person sections are completed', () => {
					const questions = getQuestions();
					const answers = {
						submittedDate: new Date(),
						categoryId: 'consultees',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.PERSON,
						submitterFirstName: 'Agent Name',
						submitterLastName: 'Test Last',
						isAgent: BOOLEAN_OPTIONS.YES,
						agentOrgName: 'Org Name',
						submitterContactPreference: 'post',
						submitterAddress: {
							addressLine1: '1 Test Street',
							town: 'Test Town',
							postcode: 'TE1 1ST'
						},
						representedFirstName: 'Represented Person',
						representedLastName: 'Represented Surname',
						submitterComment: 'some comments',
						submitterHearingPreference: BOOLEAN_OPTIONS.YES
					};

					const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
					const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

					assert.strictEqual(journey.isComplete(), true);
				});
				it('isComplete should return false if Representation and On Behalf Of Person sections are not completed', () => {
					const questions = getQuestions();
					const answers = {
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.PERSON,
						submitterFirstName: 'Agent Name',
						submitterLastName: 'Test Last',
						isAgent: BOOLEAN_OPTIONS.YES,
						agentOrgName: 'Org Name',
						submitterContactPreference: 'post',
						representedFirstName: 'Represented Person',
						representedLastName: 'Represented Surname',
						submitterComment: 'some comments',
						submitterHearingPreference: BOOLEAN_OPTIONS.YES
					};

					const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
					const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
					assert.strictEqual(journey.isComplete(), false);
				});
			});
			describe('org-not-work-for', () => {
				const defaultAnswers = () => {
					return {
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR
					};
				};
				const defaultQuestions = () => [
					'representedTypeId',
					'submitterFullName',
					'isAgent',
					'submitterComment',
					'submitterContactPreference',
					'submitterHearingPreference',
					'representedOrgName'
				];
				it('should include all default questions', () => {
					const answers = defaultAnswers();
					const questions = defaultQuestions();

					testAddRepresentationQuestionsDisplay(answers, [], questions);
				});
				it('should handle contactPreference correctly', () => {
					const answers = defaultAnswers();

					const byPostQuestions = defaultQuestions().concat('submitterAddress');
					const byEmailQuestions = defaultQuestions().concat('submitterEmail');

					answers.submitterContactPreference = 'post';
					testAddRepresentationQuestionsDisplay(answers, [], byPostQuestions);

					answers.submitterContactPreference = 'email';
					testAddRepresentationQuestionsDisplay(answers, [], byEmailQuestions);
				});
				it('should handle isAgent correctly', () => {
					const answers = defaultAnswers();

					const isAgentQuestions = defaultQuestions().concat('agentOrgName');
					const isNotAgentQuestions = defaultQuestions();

					answers.isAgent = BOOLEAN_OPTIONS.YES;
					testAddRepresentationQuestionsDisplay(answers, [], isAgentQuestions);

					answers.isAgent = BOOLEAN_OPTIONS.NO;
					testAddRepresentationQuestionsDisplay(answers, [], isNotAgentQuestions);
				});
				it('isComplete should return true if Representation and On Behalf Of Org-not-work-for sections are completed', () => {
					const questions = getQuestions();
					const answers = {
						submittedDate: new Date(),
						categoryId: 'consultees',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
						submitterFirstName: 'Agent Name',
						submitterLastName: 'Test Last',
						isAgent: BOOLEAN_OPTIONS.YES,
						agentOrgName: 'Org Name',
						submitterContactPreference: 'post',
						submitterAddress: {
							addressLine1: '1 Test Street',
							town: 'Test Town',
							postcode: 'TE1 1ST'
						},
						representedOrgName: 'Org Name Representing',
						submitterComment: 'some comments',
						submitterHearingPreference: BOOLEAN_OPTIONS.YES
					};

					const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
					const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

					assert.strictEqual(journey.isComplete(), true);
				});
				it('isComplete should return false if Representation and On Behalf Of Org-not-work-for sections are not completed', () => {
					const questions = getQuestions();
					const answers = {
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
						submitterFirstName: 'Agent Name',
						submitterLastName: 'Test Last',
						isAgent: BOOLEAN_OPTIONS.YES,
						agentOrgName: 'Org Name',
						submitterContactPreference: 'post',
						submitterAddress: {
							addressLine1: '1 Test Street',
							town: 'Test Town',
							postcode: 'TE1 1ST'
						},
						submitterComment: 'some comments',
						submitterHearingPreference: BOOLEAN_OPTIONS.YES
					};

					const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
					const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
					assert.strictEqual(journey.isComplete(), false);
				});
			});
			describe('org-work-for', () => {
				const defaultAnswers = () => {
					return {
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION
					};
				};
				const defaultQuestions = () => [
					'representedTypeId',
					'submitterFullName',
					'submitterComment',
					'submitterContactPreference',
					'submitterHearingPreference',
					'orgName',
					'orgRoleName'
				];
				it('should include all default questions', () => {
					const answers = defaultAnswers();
					const questions = defaultQuestions();
					testAddRepresentationQuestionsDisplay(answers, [], questions);
				});
				it('should handle contactPreference correctly', () => {
					const answers = defaultAnswers();

					const byPostQuestions = defaultQuestions().concat('submitterAddress');
					const byEmailQuestions = defaultQuestions().concat('submitterEmail');

					answers.submitterContactPreference = 'post';
					testAddRepresentationQuestionsDisplay(answers, [], byPostQuestions);

					answers.submitterContactPreference = 'email';
					testAddRepresentationQuestionsDisplay(answers, [], byEmailQuestions);
				});
				it('isComplete should return true if Representation and On Behalf Of Person sections are completed', () => {
					const questions = getQuestions();
					const answers = {
						submittedDate: new Date(),
						categoryId: 'consultees',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
						submitterFirstName: 'Agent Name',
						submitterLastName: 'Surname',
						submitterContactPreference: 'email',
						submitterEmail: 'someEmail@email.com',
						orgName: 'some org',
						orgRoleName: 'some job',
						submitterComment: 'some comments',
						submitterHearingPreference: BOOLEAN_OPTIONS.YES
					};

					const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
					const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });

					assert.strictEqual(journey.isComplete(), true);
				});
				it('isComplete should return false if Representation and On Behalf Of Person sections are not completed', () => {
					const questions = getQuestions();
					const answers = {
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
						submitterFirstName: 'Agent Name',
						submitterLastName: 'Test Last',
						submitterContactPreference: 'email',
						submitterEmail: 'someEmail@email.com',
						orgName: 'some org',
						submitterComment: 'some comments',
						submitterHearingPreference: BOOLEAN_OPTIONS.YES
					};

					const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
					const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
					assert.strictEqual(journey.isComplete(), false);
				});
			});
		});

		const testAddRepresentationQuestionsDisplay = (answers, expectedMyselfQuestions, expectedOnBehalfOfQuestions) => {
			const questions = getQuestions();
			const response = new JourneyResponse(JOURNEY_ID, 'sess-id', answers);
			const journey = createJourney(questions, response, { baseUrl: `/some/path/${JOURNEY_ID}` });
			const sections = journey.sections;

			assert.strictEqual(sections.length, 3);

			const mainSection = sections[0];
			assert.strictEqual(mainSection.questions.length, 3);

			const myselfSection = sections[1];
			assert.strictEqual(myselfSection.questions.length, 10);

			for (const myselfQuestion of myselfSection.questions) {
				const expected = expectedMyselfQuestions.includes(myselfQuestion.fieldName);
				assert.strictEqual(
					myselfQuestion.shouldDisplay(response),
					expected,
					`Expected ${myselfQuestion.fieldName} to be ${expected}`
				);
			}
			const onBehalfOfSection = sections[2];
			assert.strictEqual(onBehalfOfSection.questions.length, 16);

			for (const onBehalfOfQuestion of onBehalfOfSection.questions) {
				const expected = expectedOnBehalfOfQuestions.includes(onBehalfOfQuestion.fieldName);
				assert.strictEqual(
					onBehalfOfQuestion.shouldDisplay(response),
					expected,
					`Expected ${onBehalfOfQuestion.fieldName} to be ${expected}`
				);
			}
		};
	});
});
