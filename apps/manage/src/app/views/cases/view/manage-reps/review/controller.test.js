import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { viewRepresentationAwaitingReview, viewReviewRedirect } from './controller.js';
import { JourneyResponse } from '@pins/dynamic-forms/src/journey/journey-response.js';
import { ACCEPT_AND_REDACT, getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import { createJourney } from '../view/journey.js';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

describe('controller', () => {
	describe('viewRepresentationAwaitingReview', () => {
		it('should throw if no id', async () => {
			const mockReq = { params: {} };
			const mockRes = { locals: {} };
			await assert.rejects(() => viewRepresentationAwaitingReview(mockReq, mockRes), { message: 'id param required' });
		});
		it('should throw if no rep ref', async () => {
			const mockReq = { params: { id: 'case-1' } };
			const mockRes = { locals: {} };
			await assert.rejects(() => viewRepresentationAwaitingReview(mockReq, mockRes), {
				message: 'representationRef param required'
			});
		});
		it('should render the representation', async () => {
			const journeyResponse = new JourneyResponse('id-1', 'id-2', {
				applicationReference: 'app-ref',
				requiresReview: true
			});
			const questions = getQuestions();
			const mockReq = {
				params: { id: 'case-1', representationRef: 'ref-1' },
				baseUrl: 'case-1/manage-representations'
			};
			const mockRes = {
				render: mock.fn(),
				locals: {
					journeyResponse: journeyResponse,
					journey: createJourney(questions, journeyResponse, mockReq)
				}
			};
			await assert.doesNotReject(() => viewRepresentationAwaitingReview(mockReq, mockRes));
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			const viewData = mockRes.render.mock.calls[0].arguments[1];
			assert.strictEqual(viewData.requiresReview, true);
			assert.strictEqual(viewData.applicationReference, 'app-ref');
			assert.strictEqual(viewData.accept, REPRESENTATION_STATUS_ID.ACCEPTED);
			assert.strictEqual(viewData.acceptAndRedact, ACCEPT_AND_REDACT);
			assert.strictEqual(viewData.reject, REPRESENTATION_STATUS_ID.REJECTED);
		});
	});
	describe('viewReviewRedirect', () => {
		it('should redirect to review page', () => {
			const mockReq = { originalUrl: '/case-1/manage-representations/view' };
			const mockRes = {
				locals: { journeyResponse: { answers: { requiresReview: true } } },
				redirect: mock.fn()
			};
			viewReviewRedirect(mockReq, mockRes, () => {});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/case-1/manage-representations/review');
		});
		it('should redirect to view page', () => {
			const mockReq = { originalUrl: '/case-1/manage-representations/review' };
			const mockRes = {
				redirect: mock.fn()
			};
			viewReviewRedirect(mockReq, mockRes, () => {});
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/case-1/manage-representations/view');
		});
		it('should call next if not view or review', () => {
			const mockReq = { originalUrl: '/case-1/manage-representations/other' };
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			viewReviewRedirect(mockReq, mockRes, mockNext);
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
	});
});
