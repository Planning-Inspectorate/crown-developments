import { describe, it, mock, beforeEach, afterEach, type Mock } from 'node:test';
import assert from 'node:assert';
import { buildDeleteS62aManageListItemOnConfirmRemove, questionConfig } from './delete.ts';
import { S62aManageListDeleter } from './s62a-manage-list-deleter.ts';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '../../../../service.js';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { S62A_AUDIT_ACTIONS } from '../audit/actions.ts';

describe('buildDeleteS62aManageListItemOnConfirmRemove', () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let next: Mock<Function>;
	let mockService: ManageService;

	let mockInfo: Mock<Function>;
	let mockWarn: Mock<Function>;

	let orgSpy: Mock<Function>;
	let appContactSpy: Mock<Function>;
	let agentContactSpy: Mock<Function>;
	let additionalContactSpy: Mock<Function>;
	let vehicleParkingSpy: Mock<Function>;
	let inspectorSpy: Mock<Function>;
	let wasteTypeSpy: Mock<Function>;
	let housingSpy: Mock<Function>;
	let floorspaceSpy: Mock<Function>;

	beforeEach(() => {
		req = { params: {} };
		res = {};
		next = mock.fn();

		mockInfo = mock.fn();
		mockWarn = mock.fn();

		mockService = {
			logger: {
				info: mockInfo,
				warn: mockWarn
			},
			db: {}
		} as unknown as ManageService;

		orgSpy = mock.method(S62aManageListDeleter.prototype, 'deleteApplicantOrganisations', async () => {});
		appContactSpy = mock.method(S62aManageListDeleter.prototype, 'deleteApplicantContactDetails', async () => {});
		agentContactSpy = mock.method(S62aManageListDeleter.prototype, 'deleteAgentContactDetails', async () => {});
		additionalContactSpy = mock.method(S62aManageListDeleter.prototype, 'deleteAdditionalContact', async () => {});
		vehicleParkingSpy = mock.method(S62aManageListDeleter.prototype, 'deleteVehicleParking', async () => {});
		inspectorSpy = mock.method(S62aManageListDeleter.prototype, 'deleteCaseTeamInspector', async () => {});
		wasteTypeSpy = mock.method(S62aManageListDeleter.prototype, 'deleteWasteType', async () => {});
		housingSpy = mock.method(S62aManageListDeleter.prototype, 'deleteResidentialHousing', async () => {});
		floorspaceSpy = mock.method(S62aManageListDeleter.prototype, 'deleteNonResidentialFloorspace', async () => {});
	});

	afterEach(() => {
		mock.restoreAll();
	});

	describe('Early returns (Bypassing logic)', () => {
		it('calls next() and skips if manageListAction is not "remove"', async () => {
			req.params = {
				manageListAction: 'add',
				manageListQuestion: 'confirm',
				manageListItemId: '123',
				id: 'case-1',
				question: 'check-applicant-details'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(next.mock.calls[0].arguments.length, 0);
			assert.strictEqual(mockInfo.mock.callCount(), 0);
		});

		it('calls next() and skips if manageListQuestion is not "confirm"', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'start',
				manageListItemId: '123',
				id: 'case-1',
				question: 'check-applicant-details'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(mockInfo.mock.callCount(), 0);
		});

		it('calls next() and skips if required params are missing', async () => {
			req.params = { manageListAction: 'remove', manageListQuestion: 'confirm' };

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(next.mock.callCount(), 1);
		});
	});

	describe('Successful routing', () => {
		it('routes "check-applicant-details" to deleteApplicantOrganisations', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'org-1',
				id: 'case-1',
				question: 'check-applicant-details'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(orgSpy.mock.callCount(), 1);
			assert.deepStrictEqual(orgSpy.mock.calls[0].arguments, ['case-1', 'org-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "check-applicant-contact-details" to deleteApplicantContactDetails', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'contact-1',
				id: 'case-1',
				question: 'check-applicant-contact-details'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(appContactSpy.mock.callCount(), 1);
			assert.deepStrictEqual(appContactSpy.mock.calls[0].arguments, ['case-1', 'contact-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "check-case-team-inspectors" to deleteCaseTeamInspector', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'inspector-row-1',
				id: 'case-1',
				question: 'check-case-team-inspectors'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(inspectorSpy.mock.callCount(), 1);
			assert.deepStrictEqual(inspectorSpy.mock.calls[0].arguments, ['case-1', 'inspector-row-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "check-agent-contact-details" to deleteAgentContactDetails', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'agent-1',
				id: 'case-1',
				question: 'check-agent-contact-details'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(agentContactSpy.mock.callCount(), 1);
			assert.deepStrictEqual(agentContactSpy.mock.calls[0].arguments, ['case-1', 'agent-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "check-additional-contact-details" to deleteAdditionalContact', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'additional-1',
				id: 'case-1',
				question: 'check-additional-contact-details'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(additionalContactSpy.mock.callCount(), 1);
			assert.deepStrictEqual(additionalContactSpy.mock.calls[0].arguments, ['case-1', 'additional-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "check-case-team-inspectors" to deleteCaseTeamInspector', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'inspector-row-1',
				id: 'case-1',
				question: 'check-case-team-inspectors'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(inspectorSpy.mock.callCount(), 1);
			assert.deepStrictEqual(inspectorSpy.mock.calls[0].arguments, ['case-1', 'inspector-row-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});
		it('routes "vehicle-parking" to deleteVehicleParking', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'vehicle-parking-1',
				id: 'case-1',
				question: 'vehicle-parking'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(vehicleParkingSpy.mock.callCount(), 1);
			assert.deepStrictEqual(vehicleParkingSpy.mock.calls[0].arguments, ['case-1', 'vehicle-parking-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "check-waste-types" to deleteWasteType', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'waste-row-1',
				id: 'case-1',
				question: 'check-waste-types'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(wasteTypeSpy.mock.callCount(), 1);
			assert.deepStrictEqual(wasteTypeSpy.mock.calls[0].arguments, ['case-1', 'waste-row-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "proposed/housing" to deleteResidentialHousing', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'housing-row-1',
				id: 'case-1',
				section: 'proposed',
				question: 'housing'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(housingSpy.mock.callCount(), 1);
			assert.deepStrictEqual(housingSpy.mock.calls[0].arguments, ['case-1', 'housing-row-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('routes "existing/housing" to deleteResidentialHousing', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'housing-row-2',
				id: 'case-1',
				section: 'existing',
				question: 'housing'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(housingSpy.mock.callCount(), 1);
			assert.deepStrictEqual(housingSpy.mock.calls[0].arguments, ['case-1', 'housing-row-2']);
		});

		it('routes "floorspace" to deleteNonResidentialFloorspace', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'floorspace-row-1',
				id: 'case-1',
				section: 'non-residential',
				question: 'floorspace'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(floorspaceSpy.mock.callCount(), 1);
			assert.deepStrictEqual(floorspaceSpy.mock.calls[0].arguments, ['case-1', 'floorspace-row-1']);
			assert.strictEqual(next.mock.callCount(), 1);
		});

		it('does not route a floorspace removal to the housing deleter', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'floorspace-row-1',
				id: 'case-1',
				section: 'non-residential',
				question: 'floorspace'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(housingSpy.mock.callCount(), 0);
		});

		it('ignores the section when the question url alone is configured', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'waste-row-1',
				id: 'case-1',
				section: 'waste',
				question: 'check-waste-types'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(wasteTypeSpy.mock.callCount(), 1);
		});
	});

	describe('questionConfig', () => {
		it('has a delete handler for every configured question', async () => {
			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);

			for (const configKey of Object.keys(questionConfig)) {
				// Composite keys are "<section>/<question>"; the rest are the url alone.
				const [section, question] = configKey.includes('/') ? configKey.split('/') : [undefined, configKey];

				const localNext = mock.fn();
				await middleware(
					{
						params: {
							manageListAction: 'remove',
							manageListQuestion: 'confirm',
							manageListItemId: 'item-1',
							id: 'case-1',
							section,
							question
						}
					} as unknown as Request,
					res as Response,
					localNext as unknown as NextFunction
				);

				assert.strictEqual(localNext.mock.calls[0].arguments.length, 0, `${configKey} has no delete handler`);
			}
		});
	});

	describe('Error handling', () => {
		it('throws an error and calls next(err) if the question/fieldName is unmapped', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'item-1',
				id: 'case-1',
				question: 'unsupported-question'
			};

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(mockWarn.mock.callCount(), 1);

			assert.strictEqual(next.mock.callCount(), 1);
			const passedError = next.mock.calls[0].arguments[0] as Error;
			assert.ok(passedError instanceof Error);
			assert.strictEqual(
				passedError.message,
				'No delete handler for manage-list question "unsupported-question" (field "unsupported-question")'
			);
		});

		it('catches and forwards errors thrown by the deleter methods', async () => {
			req.params = {
				manageListAction: 'remove',
				manageListQuestion: 'confirm',
				manageListItemId: 'org-1',
				id: 'case-1',
				question: 'check-applicant-details'
			};

			const testError = new Error('Database connection failed');
			orgSpy.mock.restore();
			mock.method(S62aManageListDeleter.prototype, 'deleteApplicantOrganisations', async () => {
				throw testError;
			});

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(mockService);
			await middleware(req as Request, res as Response, next as unknown as NextFunction);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(next.mock.calls[0].arguments[0], testError);
		});
	});

	describe('Auditing', () => {
		let recordMany: Mock<Function>;
		let mockError: Mock<Function>;
		let auditedService: ManageService;

		const removeContactParams = {
			manageListAction: 'remove',
			manageListQuestion: 'confirm',
			manageListItemId: 'contact-1',
			id: 'case-1',
			question: 'check-applicant-contact-details'
		};

		// The case as it was before the removal, as set by the journey middleware
		const caseBeforeRemoval = {
			locals: {
				originalAnswers: {
					manageApplicantContactDetails: [
						{ id: 'contact-1', applicantFirstName: 'Test', applicantLastName: 'User One' },
						{ id: 'contact-2', applicantFirstName: 'Test', applicantLastName: 'User Two' }
					]
				}
			}
		} as unknown as Partial<Response>;

		beforeEach(() => {
			recordMany = mock.fn(async () => {});
			mockError = mock.fn();
			auditedService = {
				logger: { info: mockInfo, warn: mockWarn, error: mockError },
				db: {},
				audit: { recordMany }
			} as unknown as ManageService;

			req.params = removeContactParams;
			req.session = { account: { localAccountId: 'user-1' } } as unknown as Request['session'];
		});

		it('records the removed item in the case history', async () => {
			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(auditedService);
			await middleware(req as Request, caseBeforeRemoval as Response, next as unknown as NextFunction);

			assert.strictEqual(recordMany.mock.callCount(), 1);
			assert.deepStrictEqual(recordMany.mock.calls[0].arguments, [
				[
					{
						caseId: 'case-1',
						userId: 'user-1',
						action: S62A_AUDIT_ACTIONS.APPLICANT_CONTACT_DELETED,
						metadata: { name: 'Test User One' }
					}
				],
				CASE_DATA_MODEL.S62A
			]);
			assert.strictEqual(next.mock.calls[0].arguments.length, 0);
		});

		it('still completes the removal if recording fails', async () => {
			recordMany.mock.mockImplementation(async () => {
				throw new Error('Audit unavailable');
			});

			const middleware = buildDeleteS62aManageListItemOnConfirmRemove(auditedService);
			await middleware(req as Request, caseBeforeRemoval as Response, next as unknown as NextFunction);

			assert.strictEqual(appContactSpy.mock.callCount(), 1);
			assert.strictEqual(mockError.mock.callCount(), 1);
			assert.strictEqual(next.mock.calls[0].arguments.length, 0);
		});
	});
});
