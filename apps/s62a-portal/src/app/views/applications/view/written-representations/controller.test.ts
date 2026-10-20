import assert from 'assert';
import { describe, it } from 'node:test';
import { buildS62AWrittenRepresentationsPage } from './controller.ts';
import type { S62APortalService } from '#service';

describe('buildS62AWrittenRepresentationsPage', () => {
	const validUuid = '123e4567-e89b-12d3-a456-426614174000';

	it('should exit early and not query DB if applicationId is an invalid UUID', async (context) => {
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn()
			}
		};
		const service = { db: dbMock } as unknown as S62APortalService;

		const req = {
			params: { applicationId: 'invalid-format-id' },
			originalUrl: '/applications/invalid-format-id/written-representations'
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildS62AWrittenRepresentationsPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 0);
	});

	it('should exit early if the application is not found in the database', async (context) => {
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => null)
			}
		};
		const service = { db: dbMock } as unknown as S62APortalService;

		const req = {
			params: { applicationId: validUuid },
			originalUrl: `/applications/${validUuid}/written-representations`
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildS62AWrittenRepresentationsPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 1);

		const renderCalls = res.render.mock.calls;
		const targetViewCall = renderCalls.find(
			(c: any) => c.arguments[0] === 'views/applications/view/written-representations/view.njk'
		);
		assert.strictEqual(targetViewCall, undefined);
	});

	it('should render the written representations template with the correct payload', async (context) => {
		const mockDbCase = {
			id: validUuid,
			reference: 'S62A/2026/0001',
			representationsPublishDate: new Date('2026-01-01'),
			S62aDates: {
				withdrawnDate: null
			}
		};

		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => mockDbCase)
			},
			s62aRepresentation: {
				findMany: context.mock.fn(async () => [
					{
						reference: 'REP-001',
						submittedDate: new Date('2026-01-02'),
						comment: 'A representation',
						commentRedacted: null,
						submittedByAgentOrgName: null,
						submittedForId: 'myself',
						representedTypeId: null,
						withholdName: true,
						containsAttachments: false,
						distressingContentInRepresentation: false,
						SubmittedFor: { displayName: 'Myself' },
						SubmittedByContact: null,
						RepresentedContacts: [],
						Category: null,
						Attachments: []
					}
				]),
				count: context.mock.fn(async () => 1)
			}
		};
		const loggerMock = { error: context.mock.fn() };
		const service = { db: dbMock, logger: loggerMock } as unknown as S62APortalService;

		const req = {
			params: { applicationId: validUuid },
			originalUrl: `/applications/${validUuid}/written-representations`
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildS62AWrittenRepresentationsPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 1);
		assert.strictEqual(dbMock.s62aRepresentation.count.mock.callCount(), 6);

		assert.strictEqual(res.render.mock.callCount(), 1);

		const [template, payload] = res.render.mock.calls[0].arguments;

		assert.strictEqual(template, './view.njk');

		assert.strictEqual(payload.pageCaption, 'S62A/2026/0001');
		assert.strictEqual(payload.pageTitle, 'Written representations');
		assert.strictEqual(payload.applicationReference, 'S62A/2026/0001');
		assert.strictEqual(payload.currentUrl, `/applications/${validUuid}/written-representations`);

		assert.strictEqual(payload.caseFields.id, validUuid);
		assert.strictEqual(payload.caseFields.reference, 'S62A/2026/0001');

		assert.deepStrictEqual(payload.representationMessage, []);
		assert.strictEqual(payload.representations.length, 1);
		assert.ok(payload.links);
		assert.ok(Array.isArray(payload.links));
	});
});
