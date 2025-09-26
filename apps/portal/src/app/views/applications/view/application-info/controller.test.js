import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildApplicationInformationPage } from './controller.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

describe('application info controller', () => {
	describe('buildApplicationInformationPage', () => {
		it('should check for id', async () => {
			const mockReq = {
				params: {}
			};
			const handler = buildApplicationInformationPage({});
			await assert.rejects(() => handler(mockReq, {}), { message: 'id param required' });
		});

		it('should return not found for invalid id', async () => {
			const handler = buildApplicationInformationPage({});
			const mockReq = {
				params: { applicationId: 'abc-123' }
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
		});

		it('should return not found for non-published cases', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => null)
				}
			};
			const mockmockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
			};

			const applicationInformationPage = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});

			await assertRenders404Page(applicationInformationPage, mockmockReq, false);
		});

		it('should fetch published application', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						representationsPeriodStartDate: new Date('2025-01-01'),
						representationsPeriodEndDate: new Date('2025-01-31'),
						representationsPublishDate: '2025-10-09T09:00:00.000Z',
						applicationAcceptedDate: '2025-10-09T09:00:00.000Z',
						decisionDate: '2025-10-09T09:00:00.000Z',
						siteEasting: 654321,
						siteNorthing: 123456,
						description: 'a new crown dev application',
						ApplicantContact: {
							orgName: 'Test Name'
						},
						Type: {
							displayName: 'Planning permission'
						},
						Lpa: {
							name: 'System Test Borough Council'
						},
						Event: {
							date: new Date('2020-12-17T03:24:00.000Z'),
							venue: 'the venue'
						},
						Stage: {
							displayName: 'Consultation'
						},
						procedureId: APPLICATION_PROCEDURE_ID.HEARING,
						Procedure: {
							displayName: 'Hearing'
						},
						DecisionOutcome: {
							displayName: 'Approved'
						}
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => ({
						id: 'app-update-01',
						details: 'an update',
						firstPublished: new Date('2020-12-17T03:24:00.000Z')
					})),
					count: mock.fn(() => 3)
				}
			};
			const handler = buildApplicationInformationPage({
				db: mockDb,
				config: {}
			});
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				baseUrl: '/applications'
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			await handler(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[0],
				'views/applications/view/application-info/view.njk'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				pageCaption: 'CROWN/2025/0000001',
				applicationReference: 'CROWN/2025/0000001',
				pageTitle: 'Application information',
				shouldShowImportantDatesSection: true,
				shouldShowApplicationDecisionSection: true,
				shouldShowProcedureDetailsSection: true,
				links: [
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-information',
						text: 'Application Information'
					},
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/documents',
						text: 'Documents'
					},
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/have-your-say',
						text: 'Have your say'
					},
					{
						href: '/applications/cfe3dc29-1f63-45e6-81dd-da8183842bf8/application-updates',
						text: 'Application updates'
					}
				],
				baseUrl: '/applications',
				currentUrl: undefined,
				hasLinkedCase: false,
				linkedCaseLink: undefined,
				crownDevelopmentFields: {
					applicantName: 'Test Name',
					applicationAcceptedDate: '9 October 2025',
					applicationType: 'Planning permission',
					crownDevelopmentContactEmail: undefined,
					decisionDate: '9 October 2025',
					decisionOutcome: 'Approved',
					description: 'a new crown dev application',
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					lpaName: 'System Test Borough Council',
					procedure: 'Hearing',
					reference: 'CROWN/2025/0000001',
					representationsPeriodEndDate: '31 January 2025',
					representationsPeriodEndDateTime: '31 January 2025 at 12:00am',
					representationsPeriodStartDate: '1 January 2025',
					representationsPeriodStartDateTime: '1 January 2025 at 12:00am',
					representationsPublishDate: '9 October 2025',
					siteCoordinates: {
						easting: '654321',
						northing: '123456'
					},
					stage: 'Consultation',
					hearingDate: '17 December 2020',
					hearingVenue: 'the venue',
					isHearing: true
				},
				aboutThisApplicationSectionItems: [
					{
						key: {
							text: 'Type of application'
						},
						value: {
							text: 'Planning permission'
						}
					},
					{
						key: {
							text: 'Local planning authority'
						},
						value: {
							text: 'System Test Borough Council'
						}
					},
					{
						key: {
							text: 'Applicant name'
						},
						value: {
							text: 'Test Name'
						}
					},
					{
						key: {
							text: 'Site address'
						},
						value: {
							text: 'Easting: 654321, Northing: 123456'
						}
					},
					{
						key: {
							text: 'Description of the proposed development'
						},
						value: {
							text: 'a new crown dev application'
						}
					},
					{
						key: {
							text: 'Stage'
						},
						value: {
							text: 'Consultation'
						}
					},
					{
						key: {
							text: 'Application form'
						},
						value: {
							html: '<p class="govuk-body">To view the full application, go to the <a class="govuk-link govuk-link--no-visited-state" href="/applications/documents">Documents</a> section.</p>'
						}
					}
				],
				importantDatesSectionItems: [
					{
						key: {
							text: 'Application accepted date'
						},
						value: {
							text: '9 October 2025'
						}
					},
					{
						key: {
							text: 'Representation period'
						},
						value: {
							text: '1 January 2025 at 12:00am to 31 January 2025 at 12:00am'
						}
					},
					{
						key: {
							text: 'Decision date'
						},
						value: {
							text: '9 October 2025'
						}
					}
				],
				procedureDetailsSectionItems: [
					{
						key: {
							text: 'Procedure type'
						},
						value: {
							text: 'Hearing'
						}
					},
					{
						key: {
							text: 'Hearing date'
						},
						value: {
							text: '17 December 2020'
						}
					},
					{
						key: {
							text: 'Hearing venue'
						},
						value: {
							text: 'the venue'
						}
					}
				],
				applicationDecisionSectionItems: [
					{
						key: {
							text: 'Decision date'
						},
						value: {
							text: '9 October 2025'
						}
					},
					{
						key: {
							text: 'Decision outcome'
						},
						value: {
							text: 'Approved'
						}
					}
				],
				latestApplicationUpdate: {
					details: 'an update',
					firstPublished: '17 December 2020'
				},
				haveYourSayStatus: 'open'
			});
		});
	});
	it('shouldShowImportantDatesSection is false when required dates not present', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					reference: 'CROWN/2025/0000001',
					representationsPeriodEndDate: new Date('2025-01-31')
				}))
			},
			applicationUpdate: {
				findFirst: mock.fn(() => undefined),
				count: mock.fn(() => 0)
			}
		};
		const handler = buildApplicationInformationPage({
			db: mockDb,
			config: {}
		});
		const mockReq = {
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
		};
		const mockRes = {
			status: mock.fn(),
			render: mock.fn()
		};
		await handler(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].shouldShowImportantDatesSection, false);
	});
	it('shouldShowApplicationDecisionSection is true when required date and outcome present', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					reference: 'CROWN/2025/0000001',
					decisionDate: new Date('2025-01-31'),
					DecisionOutcome: {
						displayName: 'Approved'
					}
				}))
			},
			applicationUpdate: {
				findFirst: mock.fn(() => undefined),
				count: mock.fn(() => 0)
			}
		};
		const handler = buildApplicationInformationPage({
			db: mockDb,
			config: {}
		});
		const mockReq = {
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
		};
		const mockRes = {
			status: mock.fn(),
			render: mock.fn()
		};
		await handler(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].shouldShowApplicationDecisionSection, true);
	});
	it('shouldShowApplicationDecisionSection is false when required date and outcome not present', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
		const mockDb = {
			crownDevelopment: {
				findUnique: mock.fn(() => ({
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
					reference: 'CROWN/2025/0000001'
				}))
			},
			applicationUpdate: {
				findFirst: mock.fn(() => undefined),
				count: mock.fn(() => 0)
			}
		};
		const handler = buildApplicationInformationPage({
			db: mockDb,
			config: {}
		});
		const mockReq = {
			params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' }
		};
		const mockRes = {
			status: mock.fn(),
			render: mock.fn()
		};
		await handler(mockReq, mockRes);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].shouldShowApplicationDecisionSection, false);
	});
});
