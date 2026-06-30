import { notFoundHandler } from '../middleware/errors.ts';
import type { AsyncRequestHandler } from '../util/async-handler.ts';
import { wrapPrismaError } from '../util/database.ts';
import { getEntraGroupMembers } from '../util/entra-groups.ts';
import { createCaseHistoryViewModel } from './view-model.ts';
import { getPaginationParams, createPaginationParams } from '../views/pagination/pagination-utils.ts';
import { getStringParam } from '../util/params.ts';
import { getBaseUrl } from '../util/uuid.ts';

import type { AuditService } from '../audit/index.js';
import type { InitEntraClient } from '../graph/types.js';
import type { Logger } from 'pino';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';

import { CASE_MODELS, type CaseDataModel } from '../util/types.ts';

export interface CaseHistoryService {
	db: PrismaClient;
	logger: Logger;
	audit: AuditService;
	getEntraClient: InitEntraClient;
	entraGroupIds: {
		caseOfficers: string;
		inspectors: string;
	};
}

export function buildViewCaseHistory(service: CaseHistoryService, dataModel: CaseDataModel): AsyncRequestHandler {
	const { db, audit, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	const model = CASE_MODELS[dataModel];
	if (!model) throw new Error(`Unsupported data model: ${String(dataModel)}`);

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		let caseRow;

		try {
			caseRow = await model.delegate(db).findUnique({
				select: {
					reference: true
				},
				where: { id }
			});

			if (!caseRow) {
				return notFoundHandler(req, res);
			}
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
			audit.getAllForCase(id, dataModel, { take: pageSize, skip: skipSize }),
			audit.countForCase(id, dataModel)
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

		return res.render('view.njk', {
			pageHeading: 'View application history',
			reference: caseRow.reference,
			backLinkUrl: `${getBaseUrl(req.baseUrl)}${id}`,
			backLinkText: 'Back to case details',
			rows,
			paginationParams,
			baseUrl: req.baseUrl + req.path,
			queryParams: req.query
		});
	};
}
