import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeleteRepresentationRedactedDocumentMiddleware } from './delete-attachment-middleware.js';

describe('buildDeleteRepresentationRedactedDocumentMiddleware', () => {
	it('should throw an error if representationRef not in req.params', async () => {
		const mockReq = { params: {} };
		const deleteRepresentationRedactedDocumentMiddleware =
			buildDeleteRepresentationRedactedDocumentMiddleware('manage-reps-manage');
		await assert.rejects(() => deleteRepresentationRedactedDocumentMiddleware(mockReq, {}, mock.fn()), {
			message: 'representationRef param not found'
		});
	});
	it('should throw an error if itemId not in req.params', async () => {
		const mockReq = { params: { representationRef: 'ref-1' } };
		const deleteRepresentationRedactedDocumentMiddleware =
			buildDeleteRepresentationRedactedDocumentMiddleware('manage-reps-manage');
		await assert.rejects(() => deleteRepresentationRedactedDocumentMiddleware(mockReq, {}, mock.fn()), {
			message: 'itemId param not found'
		});
	});
	it('should throw an error if documentId not in req.params', async () => {
		const mockReq = { params: { representationRef: 'ref-1', itemId: '123' } };
		const deleteRepresentationRedactedDocumentMiddleware =
			buildDeleteRepresentationRedactedDocumentMiddleware('manage-reps-manage');
		await assert.rejects(() => deleteRepresentationRedactedDocumentMiddleware(mockReq, {}, mock.fn()), {
			message: 'documentId param not found'
		});
	});
	it('should call next if is not manage reps manage journey', async () => {
		const mockNext = mock.fn();
		const deleteRepresentationRedactedDocumentMiddleware =
			buildDeleteRepresentationRedactedDocumentMiddleware('manage-reps-review');

		await deleteRepresentationRedactedDocumentMiddleware({}, {}, mockNext);

		assert.strictEqual(mockNext.mock.callCount(), 1);
	});
	it('should safe delete file from session and add to itemsToBeDeleted if is manage reps manage journey', async () => {
		const mockReq = {
			params: {
				representationRef: 'ref-1',
				itemId: 'ID1234',
				documentId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFYL8'
			},
			session: {
				files: {
					'ref-1': {
						ID1234: {
							uploadedFiles: [
								{
									itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFYL8',
									fileName: 'test-pdf.pdf',
									mimeType: 'application/pdf',
									size: 227787
								}
							]
						},
						ID9876: {
							uploadedFiles: [
								{
									itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
									fileName: 'redacted-file.pdf',
									mimeType: 'application/pdf',
									size: 227787
								}
							]
						}
					}
				},
				itemsToBeDeleted: {
					'ref-1': []
				}
			}
		};
		const mockRes = {
			redirect: mock.fn()
		};
		const deleteRepresentationRedactedDocumentMiddleware =
			buildDeleteRepresentationRedactedDocumentMiddleware('manage-reps-manage');

		await deleteRepresentationRedactedDocumentMiddleware(mockReq, mockRes, mock.fn());

		assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(mockReq.session.files, {
			'ref-1': {
				ID1234: {
					uploadedFiles: []
				},
				ID9876: {
					uploadedFiles: [
						{
							itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
							fileName: 'redacted-file.pdf',
							mimeType: 'application/pdf',
							size: 227787
						}
					]
				}
			}
		});
		assert.deepStrictEqual(mockReq.session.itemsToBeDeleted?.['ref-1'], ['012D6AZFDCQ6AFNGRA35HJKMBRK34SFYL8']);
	});
});
