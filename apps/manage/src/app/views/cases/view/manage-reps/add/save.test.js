import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { viewAddRepresentationSuccessPage } from './save.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

describe('written representations', () => {
	describe('viewAddRepresentationSuccessPage', () => {
		it('should throw error if id is missing', async () => {
			const mockReq = { params: {} };
			await assert.rejects(() => viewAddRepresentationSuccessPage(mockReq, {}), { message: 'id param required' });
		});

		it('should return not found for invalid id', async () => {
			const mockReq = { params: { id: 'abc-123' } };
			await assertRenders404Page(viewAddRepresentationSuccessPage, mockReq, false);
		});

		it('should render the view', async () => {
			const mockReq = {
				params: {
					id: 'cfe3dc29-1f63-45e6-81dd-da8183842bf8'
				}
			};
			const mockRes = {
				render: mock.fn()
			};

			await viewAddRepresentationSuccessPage(mockReq, mockRes);

			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/view/manage-reps/add/success.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1].title, 'Representation added');
			assert.deepStrictEqual(
				mockRes.render.mock.calls[0].arguments[1].successBackLinkUrl,
				`/cases/${mockReq.params.id}/manage-representations`
			);
		});
	});
});
