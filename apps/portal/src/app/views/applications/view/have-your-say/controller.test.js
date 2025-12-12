import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	buildHaveYourSayPage,
	getIsRepresentationWindowOpen,
	viewHaveYourSayDeclarationPage,
	startHaveYourSayJourney,
	addRepresentationErrors,
	declarationValidator
} from './controller.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

describe('Have Your Say controller', () => {
	describe('buildHaveYourSayPage', () => {
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockDb = { crownDevelopment: { findUnique: mock.fn() } };
			const haveYourSayPage = buildHaveYourSayPage({ db: mockDb, config: {} });
			assert.rejects(() => haveYourSayPage(mockReq, {}), { message: 'id param required' });
		});
		it('should return not found for invalid id', async () => {
			const mockReq = {
				params: { applicationId: 'abc-123' }
			};
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const handler = buildHaveYourSayPage({ db: mockDb, config: {} });
			await assertRenders404Page(handler, mockReq, false);
		});
		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const haveYourSayPage = buildHaveYourSayPage({ db: mockDb, config: {} });
			await assertRenders404Page(haveYourSayPage, mockReq, false);
		});
		it('should render the view', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockRes = { render: mock.fn(), status: mock.fn() };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						reference: 'CROWN/2025/0000001',
						publishDate: new Date('2025-01-01')
					}))
				},
				applicationUpdate: {
					findFirst: mock.fn(() => undefined),
					count: mock.fn(() => 0)
				}
			};
			const haveYourSayPage = buildHaveYourSayPage({ db: mockDb, config: {} });
			await haveYourSayPage(mockReq, mockRes);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/applications/view/have-your-say/view.njk');
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageCaption, 'CROWN/2025/0000001');
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[1].pageTitle,
				'Have your say on a Crown Development Application'
			);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1].crownDevelopmentFields, {
				id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
				reference: 'CROWN/2025/0000001',
				applicationType: undefined,
				applicantName: undefined,
				lpaName: undefined,
				description: undefined,
				stage: undefined,
				procedure: undefined,
				applicationAcceptedDate: '',
				representationsPeriodEndDate: '',
				representationsPeriodEndDateTime: '',
				representationsPeriodStartDate: '',
				representationsPeriodStartDateTime: '',
				representationsPublishDate: '',
				decisionDate: '',
				decisionOutcome: undefined,
				crownDevelopmentContactEmail: undefined
			});
		});
	});
	describe('getIsRepresentationWindowOpen', () => {
		it('should throw error if id is missing', () => {
			const mockReq = { params: {} };
			const mockNext = mock.fn();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			assert.rejects(() => isRepresentationWindowOpen(mockReq, {}, mockNext), { message: 'id param required' });
		});
		it('should 404 if the application is not found', async () => {
			const mockReq = { params: { applicationId: '123' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn()
				}
			};
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			await assertRenders404Page(isRepresentationWindowOpen, mockReq, true);
		});
		it('should 404 when today is outside representation window', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						publishDate: new Date('2024-12-24T03:30:00Z'),
						representationsPeriodStartDate: new Date('2025-01-02T00:00:00Z'),
						representationsPeriodEndDate: new Date('2025-01-31T23:59:59Z')
					}))
				}
			};
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			await assertRenders404Page(isRepresentationWindowOpen, mockReq, true);
		});
		it('should go to next when today is within representation window', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00') });
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						publishDate: new Date('2024-12-24T03:30:00Z'),
						representationsPeriodStartDate: new Date('2025-01-01T00:00:00Z'),
						representationsPeriodEndDate: new Date('2025-01-31T23:59:59Z')
					}))
				}
			};
			const next = mock.fn();
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			await isRepresentationWindowOpen(mockReq, {}, next);
			assert.strictEqual(next.mock.callCount(), 1);
		});
		describe('representation dates handling', () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const tests = [
				// One or both representation dates are undefined
				{
					testName: 'startDate is undefined, endDate is a future date',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: undefined,
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: true
				},
				{
					testName: 'startDate is a past date, endDate is undefined',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: new Date('2025-01-01T00:00:00Z'),
						endDate: undefined
					},
					expected: true
				},
				{
					testName: 'startDate is undefined, endDate is undefined',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: undefined,
						endDate: undefined
					},
					expected: true
				},
				// One or both dates are null
				{
					testName: 'startDate is null, endDate is a future date',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: null,
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: true
				},
				{
					testName: 'startDate is a past date, endDate is null',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: new Date('2025-01-01T00:00:00Z'),
						endDate: null
					},
					expected: true
				},
				{
					testName: 'startDate is null, endDate is null',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: null,
						endDate: null
					},
					expected: true
				},
				{
					testName: 'startDate is after endDate',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: new Date('2025-02-01T00:00:00Z'),
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: true
				},
				{
					testName: 'startDate is before endDate and now is before window',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: new Date('2025-02-01T00:00:00Z'),
						endDate: new Date('2025-02-28T23:59:59Z')
					},
					expected: true
				},
				{
					testName: 'startDate is before endDate and now is after window',
					inputs: {
						now: '2025-02-01T12:00:00Z',
						startDate: new Date('2025-01-01T00:00:00Z'),
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: true
				},
				// startDate is before endDate where window is valid
				{
					testName: 'startDate is before endDate and now is within window',
					inputs: {
						now: '2025-01-01T12:00:00Z',
						startDate: new Date('2025-01-01T00:00:00Z'),
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: false
				},
				{
					testName: 'startDate is before endDate and now is the same as window start',
					inputs: {
						now: '2025-01-01T00:00:00Z',
						startDate: new Date('2025-01-01T00:00:00Z'),
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: false
				},
				{
					testName: 'startDate is before endDate and now is the same as window end',
					inputs: {
						now: '2025-01-31T23:59:59Z',
						startDate: new Date('2025-01-01T00:00:00Z'),
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: false
				},
				{
					testName: 'startDate is before endDate and now is the same as window start and end',
					inputs: {
						now: '2025-01-31T23:59:59Z',
						startDate: new Date('2025-01-01T00:00:00Z'),
						endDate: new Date('2025-01-31T23:59:59Z')
					},
					expected: false
				}
			];
			for (const test of tests) {
				const representationsPeriodStartDate = test.inputs.startDate;
				const representationsPeriodEndDate = test.inputs.endDate;
				const mockDb = {
					crownDevelopment: {
						findUnique: mock.fn(() => ({
							id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
							publishDate: new Date('2024-12-24T03:30:00Z'),
							representationsPeriodStartDate,
							representationsPeriodEndDate
						}))
					}
				};
				it(`should ${test.expected ? '404' : 'go to next'} when ${test.testName}`, async (context) => {
					context.mock.timers.enable({ apis: ['Date'], now: new Date(test.inputs.now) });
					const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
					if (test.expected) {
						await assertRenders404Page(isRepresentationWindowOpen, mockReq, true);
					} else {
						const next = mock.fn();
						await isRepresentationWindowOpen(mockReq, {}, next);
						assert.strictEqual(next.mock.callCount(), 1);
					}
				});
			}
		});
		it('should 404 when representationsPeriodStartDate is undefined', async (context) => {
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T00:00:00Z') });
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8',
						publishDate: new Date('2024-12-24T03:30:00Z'),
						representationsPeriodStartDate: new Date('2025-01-01T00:00:00Z'),
						representationsPeriodEndDate: undefined
					}))
				}
			};
			const isRepresentationWindowOpen = getIsRepresentationWindowOpen(mockDb);
			await assertRenders404Page(isRepresentationWindowOpen, mockReq, true);
		});
	});

	describe('viewHaveYourSayDeclarationPage', () => {
		it('should throw error if id is missing', async () => {
			const mockReq = { params: {} };
			await assert.rejects(() => viewHaveYourSayDeclarationPage(mockReq, {}), { message: 'id param required' });
		});

		it('should return not found for invalid id', async () => {
			const mockReq = { params: { applicationId: 'abc-123' } };
			const mockRes = { status: mock.fn(() => mockRes), render: mock.fn() };
			await viewHaveYourSayDeclarationPage(mockReq, mockRes);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
		});

		it('should render declaration page with correct title and items', async () => {
			const mockReq = { params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' } };
			const mockRes = { render: mock.fn(), status: mock.fn(() => mockRes) };
			await viewHaveYourSayDeclarationPage(mockReq, mockRes);
			const [, data] = mockRes.render.mock.calls[0].arguments;
			assert.strictEqual(data.pageTitle, 'Declaration');
			assert.strictEqual(data.id, mockReq.params.applicationId);
			assert.strictEqual(data.backLinkUrl, 'check-your-answers');
			assert.ok(Array.isArray(data.declarationCheckbox.items));
			assert.strictEqual(data.declarationCheckbox.items.length, 3);
			assert.ok(data.declarationCheckbox.items.every((i) => i.checked === false));
			assert.ok(!data.errorSummary || data.errorSummary.length === 0);
		});

		it('should show inline error markup when errorSummary is present', async () => {
			const mockReq = {
				params: { applicationId: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8' },
				body: { declaration: [] }
			};
			const mockRes = {
				render: mock.fn(),
				locals: { errorSummary: [{ text: 'Select that you agree', href: '#declaration-consent' }] },
				status: mock.fn(() => mockRes)
			};
			await viewHaveYourSayDeclarationPage(mockReq, mockRes);
			const [, data] = mockRes.render.mock.calls[0].arguments;
			assert.ok(data.declarationCheckbox.items.some((i) => i.html && i.html.includes('govuk-error-message')));
			assert.ok(Array.isArray(data.errorSummary));
		});
	});

	describe('declarationValidator', () => {
		it('should not call next when validation error', async () => {
			const mockReq = { method: 'POST', params: { applicationId: 'app-123' }, body: {} };
			const mockRes = {
				render: mock.fn((view, data) => {
					mockRes._view = view;
					mockRes._data = data;
				}),
				status: mock.fn(() => mockRes),
				locals: {}
			};
			let nextCalled = false;
			await declarationValidator(mockReq, mockRes, () => {
				nextCalled = true;
			});
			assert.strictEqual(nextCalled, false);
		});
		it('should add errors to errorSummary when validation error', async () => {
			const mockReq = { params: { applicationId: 'app-123' }, body: {} };
			const mockRes = {
				status: mock.fn(() => mockRes),
				render: mock.fn(),
				locals: {}
			};
			let nextCalled = false;
			await declarationValidator(mockReq, mockRes, () => {
				nextCalled = true;
			});
			assert.strictEqual(nextCalled, false);
			assert.ok(mockRes.locals.errorSummary.length > 0);
		});

		it('should call next when all declaration items are selected', async () => {
			const mockReq = {
				method: 'POST',
				params: { applicationId: 'app-123' },
				body: { declaration: ['consent', 'connect', 'read'] }
			};
			const mockRes = { render: mock.fn(), locals: {}, status: mock.fn(() => mockRes) };
			let nextCount = 0;
			await declarationValidator(mockReq, mockRes, () => {
				nextCount++;
			});
			assert.strictEqual(nextCount, 1);
			assert.deepStrictEqual(mockReq.body.declaration, ['consent', 'connect', 'read']);
		});
	});

	describe('startHaveYourSayJourney', () => {
		it('should log and redirect to who-submitting-for', async () => {
			const service = { logger: { info: mock.fn() } };
			const handler = startHaveYourSayJourney(service);
			const mockReq = { baseUrl: '/applications/123/have-your-say' };
			const mockRes = { redirect: mock.fn() };
			await handler(mockReq, mockRes);
			assert.strictEqual(service.logger.info.mock.callCount(), 1);
			assert.ok(service.logger.info.mock.calls[0].arguments[0].includes('Redirecting to Have Your Say Journey'));
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.redirect.mock.calls[0].arguments[0],
				'/applications/123/have-your-say/start/who-submitting-for'
			);
		});
	});

	describe('addRepresentationErrors', () => {
		it('should set errorSummary and clear session when errors exist', () => {
			const mockReq = {
				params: { applicationId: 'app-999', id: 'app-999' },
				session: {
					cases: {
						'app-999': {
							representationError: [
								{ text: 'First error', href: '#declaration-consent' },
								{ text: 'Second error', href: '#declaration-connect' }
							]
						}
					}
				}
			};
			const mockRes = {};
			const next = mock.fn();
			addRepresentationErrors(mockReq, mockRes, next);
			assert.ok(Array.isArray(mockRes.locals.errorSummary));
			assert.strictEqual(mockRes.locals.errorSummary.length, 2);
			assert.deepStrictEqual(
				mockRes.locals.errorSummary.map((e) => e.text),
				['First error', 'Second error']
			);
			assert.ok(!mockReq.session.cases['app-999'].representationError);
			assert.strictEqual(next.mock.callCount(), 1);
		});
	});
});
