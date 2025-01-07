import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildListProjects, crownDevelopmentToViewModel } from './index.js';
import { configureNunjucks } from '../../../nunjucks.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('project list', () => {
	describe('crownDevelopmentToViewModel', () => {
		it('should return null for cases not published', () => {
			const now = new Date('2025-01-08T10:45:00Z');
			const input = {
				id: 'id-1',
				name: 'Project One',
				Stage: { displayName: 'Acceptance' },
				ApplicantContact: { fullName: 'Applicant One' }
			};
			const result = crownDevelopmentToViewModel(input, now);
			assert.strictEqual(result, null);
		});
		it('should return null for cases not yet published', () => {
			const now = new Date('2025-01-08T10:45:00Z');
			const input = {
				id: 'id-1',
				name: 'Project One',
				publishDate: new Date('2025-01-11T15:45:00Z'),
				Stage: { displayName: 'Acceptance' },
				ApplicantContact: { fullName: 'Applicant One' }
			};
			const result = crownDevelopmentToViewModel(input, now);
			assert.strictEqual(result, null);
		});
		it('should map relations if they exist', () => {
			const now = new Date('2025-01-08T10:45:00Z');
			const input = {
				id: 'id-1',
				name: 'Project One',
				publishDate: new Date('2025-01-06T15:45:00Z'),
				Stage: { displayName: 'Acceptance' },
				ApplicantContact: { fullName: 'Applicant One' }
			};
			const result = crownDevelopmentToViewModel(input, now);
			assert.strictEqual(result.applicantName, 'Applicant One');
			assert.strictEqual(result.stage, 'Acceptance');
		});
		it(`should ignore relations that don't exist`, () => {
			const now = new Date('2025-01-08T10:45:00Z');
			const input = {
				id: 'id-1',
				name: 'Project One',
				publishDate: new Date('2025-01-06T15:45:00Z'),
				Stage: { displayName: 'Acceptance' }
			};
			const result = crownDevelopmentToViewModel(input, now);
			assert.strictEqual(result.applicantName, undefined);
			assert.strictEqual(result.stage, 'Acceptance');
		});
	});

	describe('list projects', () => {
		it('should render without error', async () => {
			const now = new Date('2025-01-08T10:45:00Z');
			const future = new Date('2025-01-06T15:45:00Z');
			const nunjucks = configureNunjucks();
			// mock response that calls nunjucks to render a result
			const mockRes = {
				render: mock.fn((view, data) => nunjucks.render(view, data))
			};
			const mockDb = {
				crownDevelopment: {
					findMany: mock.fn(() => [
						{ id: 'id-1', publishDate: future },
						{ id: 'id-2', publishDate: future }
					])
				}
			};
			const listCases = buildListProjects({ db: mockDb, logger: mockLogger(), getNow: () => now });
			await assert.doesNotReject(() => listCases({}, mockRes));
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].projects?.length, 2);
		});
	});
});
