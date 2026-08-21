import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { viewAddRepresentationSuccessPage } from './save.ts';
import type { Request, Response } from 'express';

interface RepresentationSession {
	representationReference?: string;
	representationSubmitted?: boolean;
	representationError?: {
		text: Array<{ text: string; url: string }>;
	};
}

interface MockSession {
	representations?: Record<string, RepresentationSession>;
}

type MockRequest = Partial<Request> & {
	params: Record<string, string>;
	session: MockSession;
};

interface RenderOptions {
	title: string;
	bodyText: string;
	successBackLinkUrl: string;
	successBackLinkText: string;
}

describe('Add Representation Controllers', () => {
	let req: MockRequest;

	let mockRedirect: ReturnType<typeof mock.fn>;
	let mockRender: ReturnType<typeof mock.fn>;
	let mockStatus: ReturnType<typeof mock.fn>;
	let mockSend: ReturnType<typeof mock.fn>;

	let res: Partial<Response>;

	const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

	beforeEach(() => {
		req = {
			params: {},
			session: {}
		};

		mockRedirect = mock.fn();
		mockRender = mock.fn();
		mockStatus = mock.fn();
		mockSend = mock.fn();

		mockStatus.mock.mockImplementation(() => res);

		res = {
			redirect: mockRedirect,
			render: mockRender,
			status: mockStatus,
			send: mockSend
		};
	});

	describe('viewAddRepresentationSuccessPage()', () => {
		it('handles invalid UUID formats (routes to notFoundHandler)', () => {
			req.params = { id: 'invalid-id-format' };

			viewAddRepresentationSuccessPage(req as Request, res as Response);

			assert.strictEqual(mockRender.mock.calls.length, 1);
			assert.strictEqual(mockRedirect.mock.calls.length, 0);
		});

		it('redirects to Check Your Answers and sets an error if representation was not submitted', () => {
			req.params = { id: VALID_UUID };
			req.session = {};

			viewAddRepresentationSuccessPage(req as Request, res as Response);

			assert.strictEqual(mockRedirect.mock.calls.length, 1);
			assert.strictEqual(
				mockRedirect.mock.calls[0].arguments[0],
				`s62a/cases/${VALID_UUID}/manage-representations/add-representation/check-your-answers`
			);

			console.log('minkus', req.session);

			const sessionData = req.session.cases[VALID_UUID]?.representationError;
			assert.ok(sessionData !== undefined, 'Expected session data to be populated with an error');
		});

		it('clears session data and renders the success page when data is valid', () => {
			req.params = { id: VALID_UUID };

			req.session = {
				representations: {
					[VALID_UUID]: {
						representationReference: 'REP-999',
						representationSubmitted: true
					}
				}
			};

			viewAddRepresentationSuccessPage(req as Request, res as Response);

			assert.strictEqual(mockRender.mock.calls.length, 1);

			const renderArgs = mockRender.mock.calls[0].arguments;
			assert.strictEqual(renderArgs[0], 'views/s62a/cases/view/manage-reps/add/success.njk');

			const renderOptions = renderArgs[1] as RenderOptions;
			assert.strictEqual(renderOptions.title, 'Representation added');
			assert.strictEqual(renderOptions.bodyText, 'Representation reference <br><strong>REP-999</strong>');

			const clearedSessionData = req.session.representations?.[VALID_UUID];
			assert.strictEqual(clearedSessionData?.representationReference, undefined);
			assert.strictEqual(clearedSessionData?.representationSubmitted, undefined);
		});
	});
});
