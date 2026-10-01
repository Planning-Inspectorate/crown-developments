import assert from 'assert';
import { describe, it } from 'node:test';
import { APPLICATION_PUBLISH_STATUS } from '@pins/crowndev-lib/util/applications.ts';
import { buildApplicationInformationPage } from './controller.ts';
import type { S62APortalService } from '#service';

describe('buildApplicationInformationPage', () => {
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
			originalUrl: '/applications/invalid-format-id/info'
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildApplicationInformationPage(service);
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
			originalUrl: `/applications/${validUuid}/info`
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildApplicationInformationPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 1);

		const renderCalls = res.render.mock.calls;
		const targetViewCall = renderCalls.find(
			(c: any) => c.arguments[0] === 'views/applications/view/application-info/view.njk'
		);
		assert.strictEqual(targetViewCall, undefined);
	});

	it('should render the application info template with the correct payload', async (context) => {
		const mockDbCase = {
			id: validUuid,
			reference: 'S62A/2026/0001',
			S62aDates: {
				withdrawnDate: null
			}
		};

		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => mockDbCase)
			}
		};
		const service = { db: dbMock } as unknown as S62APortalService;

		const req = {
			params: { applicationId: validUuid },
			originalUrl: `/applications/${validUuid}/info`
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildApplicationInformationPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 1);

		assert.strictEqual(res.render.mock.callCount(), 1);

		const [template, payload] = res.render.mock.calls[0].arguments;

		assert.strictEqual(template, 'views/applications/view/application-info/view.njk');

		assert.strictEqual(payload.pageCaption, 'S62A/2026/0001');
		assert.strictEqual(payload.pageTitle, 'Application information');
		assert.strictEqual(payload.applicationReference, 'S62A/2026/0001');
		assert.strictEqual(payload.currentUrl, `/applications/${validUuid}/info`);

		assert.deepStrictEqual(payload.s62aFields, {
			id: validUuid,
			reference: 'S62A/2026/0001',
			applicationStatus: APPLICATION_PUBLISH_STATUS.ACTIVE
		});

		assert.ok(payload.links);
		assert.ok(Array.isArray(payload.links));
	});
});
