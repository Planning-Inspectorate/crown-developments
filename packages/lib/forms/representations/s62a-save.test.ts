import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { saveS62aRepresentation, type SaveRepresentationOptions } from './s62a-save.ts';
import type { Request, Response } from 'express';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms';
import type { ManageService } from '../../../../apps/manage/src/app/service.js';

interface MockJourney {
	isComplete: () => boolean;
}

interface MockJourneyResponse {
	answers?: Record<string, unknown>;
}

type MockRequest = Partial<Request> & {
	params: Record<string, string>;
	sessionID: string;
	session: Record<string, unknown>;
};

type MockResponse = Partial<Response> & {
	locals: {
		journey?: MockJourney;
		journeyResponse?: MockJourneyResponse;
		answers?: Record<string, unknown>;
	};
	redirect: ReturnType<typeof mock.fn>;
};

interface MockLogger {
	info: ReturnType<typeof mock.fn>;
	error: ReturnType<typeof mock.fn>;
	warn: ReturnType<typeof mock.fn>;
	debug: ReturnType<typeof mock.fn>;
}

describe('saveS62aRepresentation', () => {
	let req: MockRequest;
	let res: MockResponse;
	let mockRedirect: ReturnType<typeof mock.fn>;
	let mockUniqueReferenceFn: ReturnType<typeof mock.fn>;

	let mockS62aRepresentationCreate: ReturnType<typeof mock.fn>;
	let mockDraftFindMany: ReturnType<typeof mock.fn>;
	let mockBlobCreateMany: ReturnType<typeof mock.fn>;
	let mockDraftDeleteMany: ReturnType<typeof mock.fn>;
	let mockTransaction: ReturnType<typeof mock.fn>;

	let mockService: ManageService;
	let options: SaveRepresentationOptions;

	const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';
	const SESSION_ID = 'session-12345';
	const JOURNEY_ID = 'journey-123';
	const CYA_URL = '/check-your-answers';
	const SUCCESS_URL = '/success';

	beforeEach(() => {
		mockRedirect = mock.fn();
		mockUniqueReferenceFn = mock.fn(async () => 'MOCK-REF-123');

		mockS62aRepresentationCreate = mock.fn(async () => ({ id: 'rep-123' }));
		mockDraftFindMany = mock.fn(async () => []);
		mockBlobCreateMany = mock.fn(async () => ({ count: 1 }));
		mockDraftDeleteMany = mock.fn(async () => ({ count: 1 }));

		const mockTx = {
			s62aRepresentation: { create: mockS62aRepresentationCreate },
			draftBlobRepresentationDocument: {
				findMany: mockDraftFindMany,
				deleteMany: mockDraftDeleteMany
			},
			blobRepresentationDocument: { createMany: mockBlobCreateMany }
		} as unknown as Prisma.TransactionClient;

		mockTransaction = mock.fn(async (cb: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
			return cb(mockTx);
		});

		const mockLogger: MockLogger = {
			info: mock.fn(),
			error: mock.fn(),
			warn: mock.fn(),
			debug: mock.fn()
		};

		mockService = {
			db: { $transaction: mockTransaction },
			logger: mockLogger
		} as unknown as ManageService;

		options = {
			service: mockService,
			journeyId: JOURNEY_ID,
			checkYourAnswersUrl: CYA_URL,
			successUrl: SUCCESS_URL,
			uniqueReferenceFn: mockUniqueReferenceFn
		};

		req = {
			params: { id: VALID_ID },
			sessionID: SESSION_ID,
			session: {}
		};

		res = {
			locals: {
				journey: {
					isComplete: () => true
				},
				journeyResponse: {
					answers: {}
				},
				answers: {}
			},
			redirect: mockRedirect
		};
	});

	it('throws an error if res.locals.journeyResponse is missing', async () => {
		delete res.locals.journeyResponse;

		await assert.rejects(async () => await saveS62aRepresentation(options, req as Request, res as Response), {
			message: 'journey response required'
		});
	});

	it('redirects to checkYourAnswersUrl if the journey is incomplete', async () => {
		res.locals.journey!.isComplete = () => false;

		await saveS62aRepresentation(options, req as Request, res as Response);

		assert.strictEqual(mockRedirect.mock.calls.length, 1);
		assert.strictEqual(mockRedirect.mock.calls[0].arguments[0], CYA_URL);
		assert.strictEqual(mockTransaction.mock.calls.length, 0);
	});

	it('throws an error if hasAttachments is true but no attachments are provided', async () => {
		const answersMock = {
			submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			myselfContainsAttachments: BOOLEAN_OPTIONS.YES,
			myselfBlobAttachments: []
		};

		res.locals.answers = answersMock;
		res.locals.journeyResponse!.answers = answersMock;

		await assert.rejects(async () => await saveS62aRepresentation(options, req as Request, res as Response), {
			message: 'No representation attachments found in answers'
		});
	});

	it('successfully processes a representation without attachments', async () => {
		const answersMock = {
			representationSubmittedFor: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
			myselfContainsAttachments: BOOLEAN_OPTIONS.NO
		};

		res.locals.answers = answersMock;
		res.locals.journeyResponse!.answers = answersMock;

		await saveS62aRepresentation(options, req as Request, res as Response);

		assert.strictEqual(mockTransaction.mock.calls.length, 1);
		assert.strictEqual(mockS62aRepresentationCreate.mock.calls.length, 1);
		assert.strictEqual(mockDraftFindMany.mock.calls.length, 0);
		assert.strictEqual(mockRedirect.mock.calls.length, 1);
		assert.strictEqual(mockRedirect.mock.calls[0].arguments[0], SUCCESS_URL);
	});

	it('successfully processes a representation with attachments and commits drafts', async () => {
		const answersMock = {
			representationSubmittedFor: 'submitter',
			submitterContainsAttachments: BOOLEAN_OPTIONS.YES,
			submitterBlobAttachments: [{ fileName: 'test.pdf' }]
		};

		res.locals.answers = answersMock;
		res.locals.journeyResponse!.answers = answersMock;

		mockDraftFindMany.mock.mockImplementationOnce(async () => [
			{
				fileName: 'test.pdf',
				blobName: 'blob-123',
				size: 1024,
				mimeType: 'application/pdf',
				statusId: 'uploaded'
			}
		]);

		await saveS62aRepresentation(options, req as Request, res as Response);

		assert.strictEqual(mockTransaction.mock.calls.length, 1);
		assert.strictEqual(mockS62aRepresentationCreate.mock.calls.length, 1);
		assert.strictEqual(mockDraftFindMany.mock.calls.length, 1);

		assert.strictEqual(mockBlobCreateMany.mock.calls.length, 1);
		const createManyData = mockBlobCreateMany.mock.calls[0].arguments[0];
		assert.strictEqual(createManyData.data[0].fileName, 'test.pdf');
		assert.strictEqual(createManyData.data[0].s62aRepresentationId, 'rep-123');

		assert.strictEqual(mockDraftDeleteMany.mock.calls.length, 1);
		assert.strictEqual(mockRedirect.mock.calls.length, 1);
		assert.strictEqual(mockRedirect.mock.calls[0].arguments[0], SUCCESS_URL);
	});
});
