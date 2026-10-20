import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { describe, it, type TestContext } from 'node:test';
import type { S62APortalService } from '#service';
import { REPRESENTATION_SUBMITTED_FOR_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { RepresentationDocumentsUploader } from '@pins/crowndev-lib/util/representation-document-uploader.ts';
import { FileValidator } from '@pins/crowndev-lib/validators/file-validator.ts';
import { BOOLEAN_OPTIONS, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import { PDFDocument } from 'pdf-lib';
import {
	ATTACHMENT_ERRORS,
	buildRemoveAttachment,
	buildUploadAttachments,
	MAXIMUM_ATTACHMENTS_PER_UPLOAD,
	receiveAttachments
} from './attachments.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getHaveYourSayQuestions } from './questions.ts';

const applicationId = '123e4567-e89b-12d3-a456-426614174000';
const baseUrl = `/applications/${applicationId}/have-your-say`;
const uploadPage = `${baseUrl}/myself/attachments`;
const sessionID = 'session-1';
const MB = 1024 * 1024;

const pdf = Buffer.from(await (await PDFDocument.create()).save({ useObjectStreams: false }));
/** pdf-lib won't open an encrypted PDF, which is how they're detected */
const passwordProtectedPdf = Buffer.from(
	pdf.toString('latin1').replace(/trailer\s*<</, 'trailer\n<<\n/Encrypt << /Filter /Standard /V 1 /R 2 >>'),
	'latin1'
);

interface Draft {
	id: string;
	sessionKey: string;
	fileName: string;
	blobName: string;
	size: bigint;
	mimeType: string;
}

/** The draft table and blob store, in memory */
function mockStorage(context: TestContext, drafts: Draft[] = []) {
	const db = {
		draftBlobRepresentationDocument: {
			findMany: context.mock.fn(async ({ where }: { where: { sessionKey: string } }) =>
				drafts.filter((d) => d.sessionKey === where.sessionKey)
			),
			create: context.mock.fn(async ({ data }: { data: Omit<Draft, 'id'> }) => {
				const draft = { id: randomUUID(), ...data };
				drafts.push(draft);
				return draft;
			}),
			findFirst: context.mock.fn(async ({ where }: { where: { id: string; sessionKey: string } }) =>
				drafts.find((d) => d.id === where.id && d.sessionKey === where.sessionKey)
			),
			delete: context.mock.fn(async ({ where }: { where: { id: string } }) =>
				drafts.splice(
					drafts.findIndex((d) => d.id === where.id),
					1
				)
			)
		},
		$transaction: async (operations: Promise<unknown>[]) => Promise.all(operations)
	};
	const blobStore = {
		uploadStream: context.mock.fn(async () => {}),
		deleteBlobIfExists: context.mock.fn(async () => ({ succeeded: true }))
	};
	const logger = { info() {}, warn() {}, error() {} };
	const service = { db, blobStore, logger } as unknown as S62APortalService;
	const uploader = new RepresentationDocumentsUploader(
		service.db,
		service.blobStore,
		service.logger,
		new FileValidator(service.logger)
	);
	return { drafts, db, blobStore, service, uploader };
}

function draft(fileName: string, size: number, sessionKey = sessionID): Draft {
	return {
		id: randomUUID(),
		sessionKey,
		fileName,
		blobName: `${applicationId}/representations/${randomUUID()}`,
		size: BigInt(size),
		mimeType: 'application/pdf'
	};
}

function file(originalname: string, buffer: Buffer, mimetype = 'application/pdf'): Express.Multer.File {
	return { originalname, buffer, mimetype, size: buffer.length } as Express.Multer.File;
}

/**
 * A request for the upload page, with res.locals as getJourneyResponse and getJourney leave them.
 * JavaScript uploads ask for JSON, a form submitted without JavaScript asks for HTML.
 */
function mockRequest(
	context: TestContext,
	{
		files = [],
		body = {},
		javascript = true,
		question = 'attachments',
		uploadError
	}: {
		files?: Express.Multer.File[];
		body?: Record<string, unknown>;
		javascript?: boolean;
		question?: string;
		uploadError?: string;
	} = {}
) {
	const answers = {
		submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
		myselfContainsAttachments: BOOLEAN_OPTIONS.YES
	};
	const req = {
		baseUrl,
		params: { applicationId, section: 'myself', question },
		session: {} as Record<string, any>,
		sessionID,
		files,
		body,
		accepts: (types: string[]) => (javascript ? types[0] : 'html')
	};
	const journeyResponse = new JourneyResponse(JOURNEY_ID, sessionID, answers);
	const journey = createJourney(getHaveYourSayQuestions(), journeyResponse, req as unknown as Request);
	const res = {
		locals: { journey, journeyResponse, uploadError } as Record<string, unknown>,
		json: context.mock.fn(),
		redirect: context.mock.fn(),
		status: context.mock.fn((): unknown => res),
		render: context.mock.fn()
	};
	return { req, res };
}

/** The files listed on the upload page, as the upload question reads them from the session */
function sessionFiles(req: { session: Record<string, any> }) {
	return req.session.files?.[applicationId]?.attachments?.uploadedFiles;
}

describe('buildUploadAttachments', () => {
	async function upload(context: TestContext, options: Parameters<typeof mockRequest>[1], drafts: Draft[] = []) {
		const storage = mockStorage(context, drafts);
		const { req, res } = mockRequest(context, options);
		await buildUploadAttachments(storage.service, storage.uploader)(req as never, res as never);
		return { ...storage, req, res };
	}

	/** The error the upload component shows, with JavaScript */
	function jsonError(res: { json: { mock: { calls: { arguments: unknown[] }[] } } }) {
		return (res.json.mock.calls[0].arguments[0] as { error: { message: string } }).error.message;
	}

	describe('with JavaScript', () => {
		it('should upload the file as a draft for this session and list it (Scenario 2)', async (context) => {
			const { req, res, drafts, blobStore } = await upload(context, { files: [file('report.pdf', pdf)] });

			assert.strictEqual(drafts.length, 1);
			assert.strictEqual(drafts[0].sessionKey, sessionID);
			assert.strictEqual(drafts[0].fileName, 'report.pdf');
			assert.match(drafts[0].blobName, new RegExp(`^${applicationId}/representations/`));
			assert.strictEqual(blobStore.uploadStream.mock.callCount(), 1);
			assert.deepStrictEqual(sessionFiles(req), [
				{
					id: drafts[0].id,
					itemId: drafts[0].id,
					fileName: 'report.pdf',
					mimeType: 'application/pdf',
					size: pdf.length
				}
			]);
			const response = res.json.mock.calls[0].arguments[0] as any;
			assert.strictEqual(response.file.id, drafts[0].id);
			assert.strictEqual(response.file.filename, drafts[0].id);
			assert.strictEqual(response.file.originalname, 'report.pdf');
			assert.ok(response.success.messageHtml.includes('report.pdf'));
		});
		it('should keep the attachments already uploaded listed (Scenario 3)', async (context) => {
			const { req } = await upload(context, { files: [file('second.pdf', pdf)] }, [draft('first.pdf', 100)]);

			assert.deepStrictEqual(
				sessionFiles(req).map((f: { fileName: string }) => f.fileName),
				['first.pdf', 'second.pdf']
			);
		});
		it('should not list another session’s drafts', async (context) => {
			const { req } = await upload(context, { files: [file('mine.pdf', pdf)] }, [draft('theirs.pdf', 100, 'other')]);

			assert.deepStrictEqual(
				sessionFiles(req).map((f: { fileName: string }) => f.fileName),
				['mine.pdf']
			);
		});
		it('should return the error for the upload component to show, and upload nothing', async (context) => {
			const { res, drafts, blobStore } = await upload(context, {
				files: [file('notes.txt', Buffer.from('hi'), 'text/plain')]
			});

			assert.strictEqual(jsonError(res), ATTACHMENT_ERRORS.wrongType);
			assert.strictEqual(drafts.length, 0);
			assert.strictEqual(blobStore.uploadStream.mock.callCount(), 0);
		});
	});

	describe('errors (PEAS-596 validation)', () => {
		const zip = Buffer.concat([Buffer.from('504b0304', 'hex'), Buffer.alloc(60)]);
		const cases: { name: string; files: Express.Multer.File[]; drafts?: Draft[]; error: string }[] = [
			{
				name: 'an unsupported type (Scenario 5)',
				files: [file('notes.txt', Buffer.from('hi'), 'text/plain')],
				error: ATTACHMENT_ERRORS.wrongType
			},
			{
				name: 'a zip file (Scenario 5)',
				files: [file('files.zip', zip, 'application/zip')],
				error: ATTACHMENT_ERRORS.wrongType
			},
			{
				name: 'a zip file renamed to a PDF (Scenario 5)',
				files: [file('files.pdf', zip)],
				error: ATTACHMENT_ERRORS.wrongType
			},
			{
				name: 'a file over 20MB (Scenario 6)',
				files: [file('big.pdf', Buffer.concat([pdf, Buffer.alloc(20 * MB)]))],
				error: ATTACHMENT_ERRORS.tooLarge
			},
			{
				name: 'more than 3 files at once (Scenario 7)',
				files: ['1', '2', '3', '4'].map((n) => file(`${n}.pdf`, pdf)),
				error: ATTACHMENT_ERRORS.tooManyFiles
			},
			{
				name: 'an upload taking the total over 1GB (Scenario 8)',
				files: [file('last.pdf', pdf)],
				drafts: [draft('huge.pdf', 1024 * MB - 10)],
				error: ATTACHMENT_ERRORS.totalTooLarge
			},
			{
				name: 'a file whose type cannot be determined (Scenario 11)',
				files: [file('odd.pdf', Buffer.from('not really a PDF'))],
				error: ATTACHMENT_ERRORS.fileTypeUndetermined
			},
			{
				name: 'a password protected PDF (Scenario 12)',
				files: [file('locked.pdf', passwordProtectedPdf)],
				error: ATTACHMENT_ERRORS.passwordProtected
			},
			{
				name: 'a file with the same name as one already uploaded (Scenario 13)',
				files: [file('report.pdf', pdf)],
				drafts: [draft('report.pdf', 100)],
				error: ATTACHMENT_ERRORS.duplicateName
			}
		];

		for (const { name, files, drafts, error } of cases) {
			it(`should not upload ${name}`, async (context) => {
				const storage = await upload(context, { files }, drafts);

				assert.strictEqual(jsonError(storage.res), error);
				assert.strictEqual(storage.blobStore.uploadStream.mock.callCount(), 0);
				assert.strictEqual(storage.drafts.length, drafts?.length ?? 0);
			});
		}

		it('should ask for a file when none was chosen', async (context) => {
			const { res } = await upload(context, { files: [] });

			assert.strictEqual(jsonError(res), ATTACHMENT_ERRORS.noAttachment);
		});
		it('should show the error from receiving the upload', async (context) => {
			const { res, db } = await upload(context, { files: [], uploadError: ATTACHMENT_ERRORS.tooLarge });

			assert.strictEqual(jsonError(res), ATTACHMENT_ERRORS.tooLarge);
			assert.strictEqual(db.draftBlobRepresentationDocument.findMany.mock.callCount(), 0);
		});
	});

	describe('without JavaScript (Scenario 14)', () => {
		it('should upload every file chosen and go back to the upload page', async (context) => {
			const { res, drafts } = await upload(context, {
				javascript: false,
				files: [file('a.pdf', pdf), file('b.pdf', pdf), file('c.pdf', pdf)]
			});

			assert.deepStrictEqual(
				drafts.map((d) => d.fileName),
				['a.pdf', 'b.pdf', 'c.pdf']
			);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], uploadPage);
			assert.strictEqual(res.json.mock.callCount(), 0);
		});
		it('should go back to the upload page with the errors in the session', async (context) => {
			const { req, res, drafts } = await upload(context, { javascript: false, files: [file('report.pdf', pdf)] }, [
				draft('report.pdf', 100)
			]);

			assert.strictEqual(drafts.length, 1);
			assert.strictEqual(res.redirect.mock.calls[0].arguments[0], uploadPage);
			assert.deepStrictEqual(req.session.errors, { myselfBlobAttachments: { msg: ATTACHMENT_ERRORS.duplicateName } });
			assert.deepStrictEqual(req.session.errorSummary, [
				{ text: ATTACHMENT_ERRORS.duplicateName, href: '#myselfBlobAttachments' }
			]);
		});
	});

	it('should 404 for a page that is not an upload page', async (context) => {
		const { res, drafts } = await upload(context, { question: 'email-address', files: [file('a.pdf', pdf)] });

		assert.strictEqual(res.status.mock.calls[0].arguments[0], 404);
		assert.strictEqual(drafts.length, 0);
	});
});

describe('buildRemoveAttachment (Scenario 4)', () => {
	async function remove(context: TestContext, options: Parameters<typeof mockRequest>[1], drafts: Draft[]) {
		const storage = mockStorage(context, drafts);
		const { req, res } = mockRequest(context, options);
		await buildRemoveAttachment(storage.service, storage.uploader)(req as never, res as never);
		return { ...storage, req, res };
	}

	it('should remove the attachment and keep the others listed', async (context) => {
		const keep = draft('keep.pdf', 100);
		const removed = draft('remove.pdf', 100);

		const { req, res, drafts, blobStore } = await remove(context, { body: { delete: removed.id } }, [keep, removed]);

		assert.deepStrictEqual(
			drafts.map((d) => d.fileName),
			['keep.pdf']
		);
		assert.strictEqual(blobStore.deleteBlobIfExists.mock.calls[0].arguments[0], removed.blobName);
		assert.deepStrictEqual(
			sessionFiles(req).map((f: { fileName: string }) => f.fileName),
			['keep.pdf']
		);
		assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], { success: true });
	});
	it('should go back to the upload page without JavaScript', async (context) => {
		const removed = draft('remove.pdf', 100);

		const { res, drafts } = await remove(context, { javascript: false, body: { delete: removed.id } }, [removed]);

		assert.strictEqual(drafts.length, 0);
		assert.strictEqual(res.redirect.mock.calls[0].arguments[0], uploadPage);
	});
	it('should not remove another session’s attachment', async (context) => {
		const theirs = draft('theirs.pdf', 100, 'other');

		const { drafts } = await remove(context, { body: { delete: theirs.id } }, [theirs]);

		assert.strictEqual(drafts.length, 1);
	});
	it('should not look up an id that is not a UUID', async (context) => {
		const { db, res } = await remove(context, { body: { delete: 'not-an-id' } }, []);

		assert.strictEqual(db.draftBlobRepresentationDocument.findFirst.mock.callCount(), 0);
		assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], { success: true });
	});
});

describe('receiveAttachments', () => {
	/** A multipart request, as the upload form sends it */
	function multipartRequest(files: { name: string; size: number }[]) {
		const boundary = 'boundary';
		const parts = files.map(({ name, size }) =>
			Buffer.concat([
				Buffer.from(
					`--${boundary}\r\nContent-Disposition: form-data; name="documents"; filename="${name}"\r\n` +
						'Content-Type: application/pdf\r\n\r\n'
				),
				Buffer.alloc(size),
				Buffer.from('\r\n')
			])
		);
		const body = Buffer.concat([...parts, Buffer.from(`--${boundary}--\r\n`)]);
		return Object.assign(Readable.from([body]), {
			method: 'POST',
			headers: {
				'content-type': `multipart/form-data; boundary=${boundary}`,
				'content-length': String(body.length)
			}
		});
	}

	function receive(files: { name: string; size: number }[]) {
		const req = multipartRequest(files) as unknown as Request & { files?: Express.Multer.File[] };
		const res = { locals: {} as Record<string, unknown> };
		return new Promise<{ req: typeof req; res: typeof res; error: unknown }>((resolve) => {
			receiveAttachments()(req, res as never, (error?: unknown) => resolve({ req, res, error }));
		});
	}

	it('should read the files', async () => {
		const { req, res, error } = await receive([
			{ name: 'a.pdf', size: 10 },
			{ name: 'b.pdf', size: 10 }
		]);

		assert.strictEqual(error, undefined);
		assert.deepStrictEqual(
			req.files?.map((f) => f.originalname),
			['a.pdf', 'b.pdf']
		);
		assert.strictEqual(res.locals.uploadError, undefined);
	});
	it('should stop reading a file over 20MB, and report it as too large (Scenario 6)', async () => {
		const { res, error } = await receive([{ name: 'big.pdf', size: 20 * MB + 1 }]);

		assert.strictEqual(error, undefined);
		assert.strictEqual(res.locals.uploadError, ATTACHMENT_ERRORS.tooLarge);
	});
	it('should stop reading after 3 files, and report too many (Scenario 7)', async () => {
		const files = Array.from({ length: MAXIMUM_ATTACHMENTS_PER_UPLOAD + 1 }, (_, i) => ({
			name: `${i}.pdf`,
			size: 10
		}));

		const { res, error } = await receive(files);

		assert.strictEqual(error, undefined);
		assert.strictEqual(res.locals.uploadError, ATTACHMENT_ERRORS.tooManyFiles);
	});
});
