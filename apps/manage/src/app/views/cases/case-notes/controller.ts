import type { ManageService } from '#service';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Logger } from 'pino';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getEntraGroupMembers } from '#util/entra-groups.ts';
import { AUDIT_ACTIONS } from '../../../audit/index.ts';
import { mapNotes } from '../view/view-model.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';

export function buildCreateCaseNote(service: ManageService): AsyncRequestHandler {
	const { db, logger, audit } = service;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		const { comment } = req.body as { comment?: string };

		if (typeof comment !== 'string') {
			throw new Error('comment required');
		}

		const userId = req?.session?.account?.localAccountId;

		logger.info({ id }, 'application note creation');

		if (!userId) {
			throw new Error('user Id is required');
		}

		await createCaseNote(id, comment, userId, db, logger);

		await audit.record({
			caseId: id,
			action: AUDIT_ACTIONS.CASE_NOTE_ADDED,
			userId,
			metadata: {
				caseNote: comment
			}
		});

		logger.info({ id }, 'application note created');

		res.redirect(`/cases/${id}`);
	};
}

/**
 * Creates an application note.
 */
async function createCaseNote(id: string, comment: string, userId: string, db: PrismaClient, logger: Logger) {
	try {
		await db.$transaction(async ($tx: Prisma.TransactionClient) => {
			const caseRow = await $tx.crownDevelopment.findUnique({
				where: { id }
			});

			if (!caseRow) {
				throw new Error('Crown Development case not found');
			}

			await $tx.applicationNote.create({
				data: {
					Application: {
						connect: { id }
					},
					comment,
					userId
				}
			});
		});
	} catch (error: unknown) {
		if (error instanceof Error) {
			wrapPrismaError({
				error,
				logger,
				message: 'creating an application note',
				logParams: { id }
			});
		}
	}
}

export function buildViewCaseNotes(service: ManageService): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

		if (!id) {
			throw new Error('id param required');
		}

		let caseRow;
		try {
			caseRow = await db.crownDevelopment.findUnique({
				select: {
					id: true,
					reference: true,
					Notes: {
						orderBy: { createdAt: 'desc' }
					}
				},
				where: { id }
			});
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

		return res.render('views/cases/case-notes/view.njk', {
			pageHeading: 'Case notes',
			reference: caseRow?.reference,
			backLinkUrl: `/cases/${id}`,
			backLinkText: 'Back to case details',
			currentUrl: req.originalUrl,
			...notes
		});
	};
}
