import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { createCaseHistoryViewModel } from './view-model.ts';
import { getPaginationParams, createPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';

export function buildViewCaseHistory(service: ManageService): AsyncRequestHandler {
	const { db, audit, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		let caseRow;
		try {
			caseRow = await db.crownDevelopment.findUnique({
				select: {
					reference: true
				},
				where: { id }
			});
		} catch (error: unknown) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching case for history',
				logParams: {}
			});
		}

		if (!caseRow) {
			return notFoundHandler(req, res);
		}

		const { pageSize, skipSize } = getPaginationParams(req);

		const [events, totalCount] = await Promise.all([
			audit.getAllForCase(id, { take: pageSize, skip: skipSize }),
			audit.countForCase(id)
		]);

		const paginationParams = createPaginationParams(req, totalCount);

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		const allMembers = [...groupMembers.caseOfficers, ...groupMembers.inspectors];
		const userMap = new Map(allMembers.map((member) => [member.id, member.displayName]));

		const eventsWithUserNames = events.map((event) => ({
			...event,
			userName: userMap.get(event.userId ?? '') ?? 'Unknown User'
		}));

		const rows = createCaseHistoryViewModel(eventsWithUserNames);

		return res.render('views/cases/case-history/view.njk', {
			pageHeading: 'View application history',
			reference: caseRow.reference,
			backLinkUrl: `/cases/${id}`,
			backLinkText: 'Back to case details',
			rows,
			paginationParams,
			baseUrl: req.baseUrl + req.path,
			queryParams: req.query
		});
	};
}
