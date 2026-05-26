import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import type { Request, Response } from 'express';
import { buildViewFolders } from './controller.ts';
import type { ManageService } from '../../../../service.js';

describe('folders controller', () => {
	describe('buildViewFolders', () => {
		let mockReq: Request;
		let mockRes: Response;
		let mockService: ManageService;

		let renderMock: ReturnType<typeof mock.fn>;
		let findUniqueMock: ReturnType<typeof mock.fn>;
		let findManyMock: ReturnType<typeof mock.fn>;

		beforeEach(() => {
			renderMock = mock.fn();
			findUniqueMock = mock.fn(async () => ({ reference: 'REF-001' }));
			findManyMock = mock.fn(async () => [{ id: 'folder-1', displayName: 'Documents', parentFolderId: null }]);

			mockReq = {
				params: { id: 'case-123' },
				originalUrl: '/cases/case-123/folders'
			} as unknown as Request;

			mockRes = {
				render: renderMock,
				status: mock.fn(() => mockRes),
				send: mock.fn()
			} as unknown as Response;

			mockService = {
				db: {
					crownDevelopment: { findUnique: findUniqueMock },
					s62AFolder: { findMany: findManyMock }
				},
				logger: { error: mock.fn(), info: mock.fn() }
			} as unknown as ManageService;
		});

		it('should throw an error if the id parameter is missing entirely', async () => {
			const handler = buildViewFolders(mockService);
			mockReq.params = {};

			await assert.rejects(
				handler(mockReq, mockRes, () => {}),
				/id param required/
			);
		});

		it('should correctly extract the id if req.params.id is an array', async () => {
			const handler = buildViewFolders(mockService);

			mockReq.params = { id: ['array-id-123', 'ignored'] as unknown as string };

			await handler(mockReq, mockRes, () => {});

			const callArgs = findUniqueMock.mock.calls[0].arguments[0] as { where: { id: string } };
			assert.strictEqual(callArgs.where.id, 'array-id-123');
		});

		it('should fetch data and render the view correctly on a successful request', async () => {
			const handler = buildViewFolders(mockService);

			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(findUniqueMock.mock.callCount(), 1);
			assert.strictEqual(findManyMock.mock.callCount(), 1);

			assert.strictEqual(renderMock.mock.callCount(), 1);

			const [templateName, viewData] = renderMock.mock.calls[0].arguments as [
				string,
				{ pageHeading: string; backLinkUrl: string; currentUrl: string; folders: unknown }
			];

			assert.strictEqual(templateName, 'views/cases/view/folders/view.njk');
			assert.strictEqual(viewData.pageHeading, 'REF-001');
			assert.strictEqual(viewData.backLinkUrl, '/cases/case-123');
			assert.strictEqual(viewData.currentUrl, '/cases/case-123/folders');
			assert.ok(viewData.folders);
		});
	});
});
