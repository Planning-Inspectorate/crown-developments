import { describe, it, mock, beforeEach, afterEach, type Mock } from 'node:test';
import assert from 'node:assert';
import { buildDeleteS62aManageListItemOnConfirmRemove } from './delete.ts';
import { S62aManageListDeleter } from './s62a-manage-list-deleter.ts';
import type { Request, Response, NextFunction } from 'express';
import type { ManageService } from '../../../../service.js';

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
});
