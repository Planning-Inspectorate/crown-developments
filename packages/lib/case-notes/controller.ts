import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Logger } from 'pino';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getEntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import { AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/index.ts';
import { mapNotes } from '../../../apps/manage/src/app/views/cases/view/view-model.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';
import { getBaseUrl } from '../util/uuid.ts';
import type { CaseDataModel } from '../util/types.ts';
import type { CaseNotesService } from './index.ts';
import { createPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';

export function buildCreateCaseNote(service: CaseNotesService, dataModel: CaseDataModel): AsyncRequestHandler {
	const { db, logger, audit } = service;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		const { comment } = req.body as { comment?: string };

		if (typeof comment !== 'string') {
			throw new Error('comment required');
		}

		//DEBUG CODE REMOVE BEFORE COMMIT
		const userId = 'exampleUser';

		//const userId = req?.session?.account?.localAccountId;

		logger.info({ id }, 'application note creation');

		if (!userId) {
			throw new Error('user Id is required');
		}

		await createCaseNote(id, comment, userId, db, logger, dataModel);

		if (service.isAuditLive !== false) {
			await audit.record(
				{
					caseId: id,
					action: AUDIT_ACTIONS.CASE_NOTE_ADDED,
					userId,
					metadata: {
						caseNote: comment
					}
				},
				CASE_DATA_MODEL.CROWN
			);
		}

		logger.info({ id }, 'application note created');

		res.redirect(`/cases/${id}`);
	};
}

/**
 * Creates an application note for the given model
 */
async function createCaseNote(
	id: string,
	comment: string,
	userId: string,
	db: PrismaClient,
	logger: Logger,
	dataModel: CaseDataModel
) {
	try {
		await db.$transaction(async ($tx: Prisma.TransactionClient) => {
			let caseRow;
			let relationData;

			if (dataModel === 'crown') {
				caseRow = await $tx.crownDevelopment.findUnique({ where: { id } });
				relationData = { CrownDevelopment: { connect: { id } } };
			} else if (dataModel === 's62a') {
				caseRow = await $tx.s62aCase.findUnique({ where: { id } });
				relationData = { S62aCase: { connect: { id } } };
			}

			if (!caseRow) {
				throw new Error(`${dataModel} case not found`);
			}
			console.log('Create Note Debug');
			await $tx.applicationNote.create({
				data: {
					comment,
					userId,
					...relationData
				}
			});
		});
	} catch (error: unknown) {
		if (error instanceof Error) {
			wrapPrismaError({
				error,
				logger,
				message: `creating an application note for ${dataModel}`,
				logParams: { id }
			});
		}
	}
}

export function buildCreateCaseNoteHandler(service: CaseNotesService, dataModel: CaseDataModel): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		if (!id) {
			throw new Error('id param required');
		}

		const comment = (req.body as Record<string, unknown>)?.comment as string;

		const userId = req?.session?.account?.localAccountId;

		if (!userId) {
			throw new Error('user Id is required');
		}

		if (!comment) {
			res.redirect(`${getBaseUrl(req.baseUrl)}${id}`);
			return;
		}

		try {
			await createCaseNote(id, comment, userId, db, logger, dataModel);
			res.redirect(`${getBaseUrl(req.baseUrl)}${id}`);
		} catch (error) {
			logger.error({ error }, `Failed to create case note for ${dataModel}`);
			res.status(500).send('Unable to save case note');
		}
	};
}

export function buildFetchCaseNotesMiddleware(
	service: CaseNotesService,
	dataModel: CaseDataModel
): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res, next) => {
		const id = req.params.id as string;

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		let caseRow;
		try {
			if (dataModel == 'crown') {
				caseRow = await crownCaseNotes(db, id);
			} else if (dataModel == 's62a') {
				caseRow = await s62aCaseNotes(db, id);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching all application notes',
					logParams: { id }
				});
			}
		}

		if (!caseRow) {
			return notFoundHandler(req, res);
		}

		const notes = mapNotes(caseRow.Notes, groupMembers, caseRow.id);
		res.locals.caseNoteData = notes.caseNotes;

		const paginationParams = createPaginationParams(req, notes.caseNotes.length);
		res.locals.caseNotePaginationParams = paginationParams;

		next?.();
	};
}

async function crownCaseNotes(db: PrismaClient, id: string) {
	const caseRow = await db.crownDevelopment.findUnique({
		select: {
			id: true,
			reference: true,
			Notes: {
				orderBy: { createdAt: 'desc' }
			}
		},
		where: { id }
	});

	return caseRow;
}

async function s62aCaseNotes(db: PrismaClient, id: string) {
	const caseRow = await db.s62aCase.findUnique({
		select: {
			id: true,
			reference: true,
			Notes: {
				orderBy: { createdAt: 'desc' }
			}
		},
		where: { id }
	});

	return caseRow;
}

export function buildViewCaseNotes(service: CaseNotesService, dataModel: CaseDataModel): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		if (!id) {
			throw new Error('id param required');
		}

		let caseRow;
		try {
			if (dataModel == 'crown') {
				caseRow = await crownCaseNotes(db, id);
			} else if (dataModel == 's62a') {
				caseRow = await s62aCaseNotes(db, id);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching all application notes',
					logParams: { id }
				});
			}
		}

		if (!caseRow) {
			return notFoundHandler(req, res);
		}

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		const notes = mapNotes(caseRow.Notes, groupMembers, caseRow.id);

		return res.render('./view.njk', {
			pageHeading: 'Case notes',
			reference: caseRow?.reference,
			backLinkUrl: `${getBaseUrl(req.baseUrl)}${id}`,
			backLinkText: 'Back to case details',
			currentUrl: req.originalUrl,
			displayRef: true,
			...notes
		});
	};
}

export function buildViewAddCaseNotes(service: CaseNotesService, dataModel: CaseDataModel): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		if (!id) {
			throw new Error('id param required');
		}

		let caseRow;
		try {
			if (dataModel == 'crown') {
				caseRow = await crownCaseNotes(db, id);
			} else if (dataModel == 's62a') {
				caseRow = await s62aCaseNotes(db, id);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching all application notes',
					logParams: { id }
				});
			}
		}

		if (!caseRow) {
			return notFoundHandler(req, res);
		}

		const groupMembers = await getEntraGroupMembers({
			logger,
			initClient: getEntraClient,
			session: req.session,
			groupIds
		});

		const notes = mapNotes(caseRow.Notes, groupMembers, caseRow.id);

		return res.render(
			'add-case.njk',
			{
				backLinkUrl: `${getBaseUrl(req.baseUrl)}${id}`,
				backLinkText: 'Back',
				currentUrl: req.originalUrl,
				displayRef: true,
				...notes
			},
			(err, html) => {
				if (err) {
					console.error('Template render error:', err);
					return res.status(500).send('Template error');
				}
				res.send(html);
			}
		);
	};
}
