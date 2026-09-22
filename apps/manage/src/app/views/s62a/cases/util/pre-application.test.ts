import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	PRE_APPLICATION_ADVICE_ID,
	PRE_APPLICATION_OR_APPLICATION_ID,
	S62A_STATUS_ID
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	getPreApplicationCaseOptions,
	isPreApplicationAdviceGiven,
	isPreApplicationCaseLinkable,
	linkablePreApplicationWhere,
	showPreApplicationTab
} from './pre-application.ts';

type Db = Parameters<typeof getPreApplicationCaseOptions>[0];

describe('pre-application util', () => {
	describe('isPreApplicationAdviceGiven', () => {
		it('is true when advice came from PINS or the council', () => {
			assert.strictEqual(isPreApplicationAdviceGiven(PRE_APPLICATION_ADVICE_ID.PINS), true);
			assert.strictEqual(isPreApplicationAdviceGiven(PRE_APPLICATION_ADVICE_ID.COUNCIL), true);
		});

		it('is false when no advice was requested, or nothing is answered', () => {
			assert.strictEqual(isPreApplicationAdviceGiven(PRE_APPLICATION_ADVICE_ID.NO), false);
			assert.strictEqual(isPreApplicationAdviceGiven(undefined), false);
			assert.strictEqual(isPreApplicationAdviceGiven(null), false);
			assert.strictEqual(isPreApplicationAdviceGiven(''), false);
		});
	});

	describe('linkablePreApplicationWhere', () => {
		const notWithdrawn = {
			OR: [{ s62aStatusId: null }, { s62aStatusId: { not: S62A_STATUS_ID.WITHDRAWN } }]
		};

		it('excludes withdrawn and already-linked pre-applications when there is no current case', () => {
			assert.deepStrictEqual(linkablePreApplicationWhere(), {
				applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
				AND: [notWithdrawn, { OR: [{ LinkedApplications: { none: {} } }] }]
			});
		});

		it('also keeps the pre-application the current case is already linked to', () => {
			assert.deepStrictEqual(linkablePreApplicationWhere('case-123'), {
				applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION,
				AND: [
					notWithdrawn,
					{
						OR: [{ LinkedApplications: { none: {} } }, { LinkedApplications: { some: { id: 'case-123' } } }]
					}
				]
			});
		});
	});

	describe('getPreApplicationCaseOptions', () => {
		it('maps cases to options, using the id as the value', async () => {
			const findMany = mock.fn(async () => [
				{ id: 'id-1', reference: 'S62A/2026/0000001/PRE' },
				{ id: 'id-2', reference: 'S62A/2026/0000002/PRE' }
			]);
			const db = { s62aCase: { findMany } } as unknown as Db;

			const options = await getPreApplicationCaseOptions(db);

			assert.deepStrictEqual(options, [
				{ value: 'id-1', text: 'S62A/2026/0000001/PRE' },
				{ value: 'id-2', text: 'S62A/2026/0000002/PRE' }
			]);
		});

		it('queries with the linkable filter, sorted by reference', async () => {
			const findMany = mock.fn(async (_args: Record<string, unknown>) => []);
			const db = { s62aCase: { findMany } } as unknown as Db;

			await getPreApplicationCaseOptions(db);

			assert.strictEqual(findMany.mock.callCount(), 1);
			const args = findMany.mock.calls[0].arguments[0];
			assert.deepStrictEqual(args.where, linkablePreApplicationWhere());
			assert.deepStrictEqual(args.orderBy, { reference: 'asc' });
		});

		it('returns an empty list when nothing is linkable', async () => {
			const db = { s62aCase: { findMany: mock.fn(async () => []) } } as unknown as Db;

			assert.deepStrictEqual(await getPreApplicationCaseOptions(db), []);
		});

		it('passes the current case through, so its own link stays selectable', async () => {
			const findMany = mock.fn(async (_args: Record<string, unknown>) => []);
			const db = { s62aCase: { findMany } } as unknown as Db;

			await getPreApplicationCaseOptions(db, 'case-123');

			assert.deepStrictEqual(findMany.mock.calls[0].arguments[0].where, linkablePreApplicationWhere('case-123'));
		});
	});

	describe('isPreApplicationCaseLinkable', () => {
		it('is true when the case still matches the filter', async () => {
			const findFirst = mock.fn(async (_args: Record<string, unknown>) => ({ id: 'id-1' }));
			const db = { s62aCase: { findFirst } } as unknown as Db;

			assert.strictEqual(await isPreApplicationCaseLinkable(db, 'id-1'), true);

			const args = findFirst.mock.calls[0].arguments[0];
			assert.deepStrictEqual(args.where, { id: 'id-1', ...linkablePreApplicationWhere() });
		});

		it('is false when the case has been withdrawn or linked since the page loaded', async () => {
			const db = { s62aCase: { findFirst: mock.fn(async () => null) } } as unknown as Db;

			assert.strictEqual(await isPreApplicationCaseLinkable(db, 'id-1'), false);
		});

		it('passes the current case through', async () => {
			const findFirst = mock.fn(async (_args: Record<string, unknown>) => ({ id: 'pre-1' }));
			const db = { s62aCase: { findFirst } } as unknown as Db;

			await isPreApplicationCaseLinkable(db, 'pre-1', 'case-123');

			assert.deepStrictEqual(findFirst.mock.calls[0].arguments[0].where, {
				id: 'pre-1',
				...linkablePreApplicationWhere('case-123')
			});
		});
	});

	describe('showPreApplicationTab', () => {
		const forApplication = (preApplicationAdviceId?: string | null) =>
			showPreApplicationTab({
				applicationPhaseId: PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION,
				preApplicationAdviceId
			});

		it('shows the tab on an application once advice is recorded', () => {
			assert.strictEqual(forApplication(PRE_APPLICATION_ADVICE_ID.PINS), true);
			assert.strictEqual(forApplication(PRE_APPLICATION_ADVICE_ID.COUNCIL), true);
		});

		it('hides the tab on an application when no advice was requested', () => {
			assert.strictEqual(forApplication(PRE_APPLICATION_ADVICE_ID.NO), false);
		});

		it('hides the tab while the advice question is unanswered', () => {
			assert.strictEqual(forApplication(undefined), false);
			assert.strictEqual(forApplication(null), false);
		});

		it('hides the tab when there are no answers', () => {
			assert.strictEqual(showPreApplicationTab(undefined), false);
		});
	});
});
