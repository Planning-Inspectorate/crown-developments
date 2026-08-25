import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createJourney, JOURNEY_ID } from './journey.ts';
import type { Question, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';

describe('s62a case details journey', () => {
	it('should error if used with the wrong router structure', () => {
		const mockQuestions = {} as Record<string, Question>;
		const mockRes = {} as unknown as JourneyResponse;
		const mockReq = {
			params: { id: 'case-123', tab: 'overview' },
			baseUrl: '/s62a/cases/wrong-path/overview'
		} as unknown as Request;

		assert.throws(() => createJourney(mockQuestions, mockRes, mockReq), {
			message: `not a valid request for the ${JOURNEY_ID} journey (invalid baseUrl)`
		});
	});

	it('should create a journey with the correct configuration', () => {
		const mockRes = {} as unknown as JourneyResponse;
		const mockReq = {
			params: { id: 'case-123', tab: 'overview' },
			baseUrl: '/s62a/cases/case-123/overview'
		} as unknown as Request;

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		) as unknown as Record<string, Question>;

		const journey = createJourney(mockQuestions, mockRes, mockReq);

		assert.strictEqual(journey.journeyId, JOURNEY_ID);
		assert.strictEqual(journey.journeyTitle, 'Case details');
		assert.strictEqual(journey.returnToListing, false);
		assert.strictEqual(journey.journeyTemplate, 'views/layouts/forms-question.njk');
		assert.strictEqual(journey.taskListTemplate, 'views/s62a/cases/view/view.njk');
		assert.strictEqual(journey.taskListUrl, '/s62a/cases/case-123/overview');

		assert.strictEqual(journey.makeBaseUrl(mockRes), '/s62a/cases/case-123/overview');
	});

	it('should create static sections with the correct order and questions', () => {
		const mockRes = {} as unknown as JourneyResponse;
		const mockReq = {
			params: { id: 'case-123', tab: 'overview' },
			baseUrl: '/s62a/cases/case-123/overview'
		} as unknown as Request;

		const mockQuestions = new Proxy(
			{},
			{
				get: (_target, prop) => ({ fieldName: prop })
			}
		) as unknown as Record<string, Question>;

		const journey = createJourney(mockQuestions, mockRes, mockReq);

		const expectedSections = [
			{
				title: '',
				segment: 'overview',
				questions: [
					'reference',
					'developmentDescription',
					'likelyIssues',
					'applicationType',
					'applicationSubType',
					'applicationClassification',
					'applicationPhase',
					'specialism',
					'inspectorBand',
					'localPlanningAuthority',
					'hasSecondaryLpa',
					'secondaryLocalPlanningAuthority',
					'siteAddress',
					'siteCoordinates',
					'siteVisibility',
					'siteArea',
					'expectedSubmissionDate'
				]
			},
			{
				title: '',
				segment: 'details',
				questions: [
					'lastUpdated',
					'createdDate',
					'category',
					'procedure',
					'applicationStatus',
					'stage',
					'lpaReference',
					'listedBuildingReference',
					'greenBelt',
					'healthAndSafetyIssues',
					'cilLiable',
					'cilAmount',
					'bngExempt'
				]
			},
			{
				title: '',
				segment: 'contacts',
				questions: [
					'applicantType',
					'manageApplicantOrganisations',
					'manageApplicantContactDetails',
					'hasAgent',
					'agentName',
					'agentAddress',
					'manageAgentContacts',
					'lpaContactDetails',
					'lpaAddress',
					'secondaryLpaContactDetails',
					'secondaryLpaAddress',
					'manageAdditionalContacts'
				]
			},
			{
				title: '',
				segment: 'dates',
				questions: [
					'notificationReceivedDate',
					'applicationReceivedDate',
					'applicationAcknowledgedDate',
					'furtherInformationRequestedDate',
					'agreedForAdditionalInformationDate',
					'applicationValidDate',
					'validLettersSentDate',
					'lpaQuestionnaireSentDate',
					'lpaQuestionnaireReceivedDate',
					'targetPublishDate',
					'publishDate',
					'pressNoticeDate',
					'neighboursNotifiedByLpaDate',
					'lpaInterestedPartiesDeadlineDate',
					'siteNoticeByLpaDate',
					'interestedPartiesPressNoticeDeadlineDate',
					'mineralApplicationsDate',
					'interimFindingsDate',
					'reconsultationDetailsDate',
					's106SubmittedDate',
					'targetDecisionDate',
					'extendedTargetDecisionDate',
					'recoveredDate',
					'withdrawnDate',
					'turnedAwayDate'
				]
			},
			{
				title: '',
				segment: 'representations',
				questions: ['representationsPeriod', 'representationsPublishDate']
			},
			{
				title: '',
				segment: 'case-team',
				questions: ['manageCaseTeamInspectors', 'caseOfficer', 'assessorInspector', 'planningOfficer', 'reader']
			},
			{
				title: '',
				segment: 'fee',
				questions: [
					'hasPreApplicationFee',
					'chargingScheduleSentDate',
					'customerNumber',
					'invoiceDate',
					'preApplicationFeeReceivedDate',
					'hasApplicationFee',
					'applicationFeeReceivedDate',
					'eligibleForFeeRefund',
					'applicationFeeRefundDate'
				]
			},
			{
				title: '',
				segment: 'event',
				questions: [
					'noticeOfProcedureDate',
					'siteVisit',
					'siteVisitType',
					'hearingDate',
					'hearingDuration',
					'hearingVenue',
					'hearingNotificationDate',
					'additionalMeeting',
					'hearingIssuesReportPublishedDate'
				]
			},
			{
				title: '',
				segment: 'outcome',
				questions: ['outcomeType', 'decisionOutcome', 'decisionDate', 'recoveredReportSentDate']
			},
			{
				title: '',
				segment: 'eia',
				questions: ['eiaScreening', 'eiaScreeningOutcome', 'environmentalStatementReceivedDate']
			},
			{
				title: '',
				segment: 'press-notice',
				questions: ['pressNoticeCost', 'pressNoticePlaced', 'pressNoticeReference']
			},
			{
				title: '',
				segment: 'vehicle-parking',
				questions: ['vehicleParking']
			},
			{
				title: '',
				segment: 'waste',
				questions: ['wasteActivitiesDescription', 'wasteManagementDevelopment', 'manageWasteTypes']
			},
			{
				title: '',
				segment: 'pre-application',
				questions: [
					'preApplicationAdvice',
					'preApplicationReceivedDate',
					'preApplicationAdviceIssuedDate',
					'preApplicationReference'
				]
			},
			{
				title: '',
				segment: 'residential',
				questions: ['residentialUnitsChange', 'totalNetGainOrLossOfUnits']
			},
			{
				title: 'Existing residential',
				segment: 'existing',
				questions: ['hasExistingHousing', 'manageExistingHousing']
			},
			{
				title: 'Proposed residential',
				segment: 'proposed',
				questions: ['hasProposedHousing', 'manageProposedHousing']
			}
		];

		assert.strictEqual(
			journey.sections.length,
			expectedSections.length,
			`Journey should have exactly ${expectedSections.length} section(s)`
		);

		expectedSections.forEach((expected, index) => {
			const actualSection = journey.sections[index];

			assert.ok(actualSection, `Section '${expected.title}' should exist`);
			assert.strictEqual(actualSection.name, expected.title, `Section title mismatch at index ${index}`);
			assert.strictEqual(actualSection.segment, expected.segment, `Section '${expected.title}' segment mismatch`);

			assert.strictEqual(
				actualSection.questions.length,
				expected.questions.length,
				`Section '${expected.title}' has incorrect number of questions`
			);

			expected.questions.forEach((qKey, qIndex) => {
				const actualQuestion = actualSection.questions[qIndex];
				assert.strictEqual(
					actualQuestion.fieldName,
					qKey,
					`Section '${expected.title}' question at index ${qIndex} should be '${qKey}'`
				);
			});
		});
	});
});

describe('residential total rows', () => {
	const mockReq = {
		params: { id: 'case-123', tab: 'residential' },
		baseUrl: '/s62a/cases/case-123/residential'
	} as unknown as Request;

	/** Every question the residential sections reference, plus any derived rows. */
	const questionsWith = (...derived: string[]) =>
		new Proxy(Object.fromEntries(derived.map((name) => [name, { fieldName: name }])), {
			get: (target, prop: string) => target[prop] ?? { fieldName: prop }
		}) as unknown as Record<string, Question>;

	const sectionQuestions = (journey: ReturnType<typeof createJourney>, segment: string) => {
		const section = journey.sections.find((s) => s.segment === segment);
		if (!section) throw new Error(`section ${segment} not found`);
		return section.questions.map((question) => question.fieldName);
	};

	const response = { answers: {} } as unknown as JourneyResponse;

	it('adds no rows when the questions object has none', () => {
		const journey = createJourney(questionsWith(), response, mockReq);

		assert.deepStrictEqual(sectionQuestions(journey, 'existing'), ['hasExistingHousing', 'manageExistingHousing']);
	});

	it('appends the side total and its occupancy rows, in the order they were defined', () => {
		const journey = createJourney(
			questionsWith('totalExistingUnits', 'totalExistingUnits_market-housing', 'totalExistingUnits_starter-homes'),
			response,
			mockReq
		);

		assert.deepStrictEqual(sectionQuestions(journey, 'existing'), [
			'hasExistingHousing',
			'manageExistingHousing',
			'totalExistingUnits',
			'totalExistingUnits_market-housing',
			'totalExistingUnits_starter-homes'
		]);
	});

	it('matches rows to their own side by field name prefix', () => {
		const journey = createJourney(
			questionsWith('totalExistingUnits', 'totalProposedUnits', 'totalProposedUnits_market-housing'),
			response,
			mockReq
		);

		assert.deepStrictEqual(sectionQuestions(journey, 'existing'), [
			'hasExistingHousing',
			'manageExistingHousing',
			'totalExistingUnits'
		]);
		assert.deepStrictEqual(sectionQuestions(journey, 'proposed'), [
			'hasProposedHousing',
			'manageProposedHousing',
			'totalProposedUnits',
			'totalProposedUnits_market-housing'
		]);
	});

	it('does not hide the net row, which stays calculable when a side is No', () => {
		const journey = createJourney(questionsWith('totalExistingUnits'), response, mockReq);

		assert.ok(sectionQuestions(journey, 'residential').includes('totalNetGainOrLossOfUnits'));
	});
});
