import { wrapPrismaError } from '@planning-inspectorate/core/util';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Logger } from 'pino';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getEntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import { AUDIT_ACTIONS } from '@pins/crowndev-lib/audit/index.ts';
import { formatDateForDisplay, nl2br } from '@planning-inspectorate/dynamic-forms';
import escape from 'escape-html';
import {
	CASE_NOTE_MAX_LENGTH,
	shouldTruncateComment,
	truncateComment,
	truncatedReadMoreCommentLink
} from '@pins/crowndev-lib/util/questions.ts';
import type { EntraGroupMembers } from '@pins/crowndev-lib/util/entra-groups.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { getBaseUrl } from '../util/uuid.ts';
import type { CaseDataModel } from '../util/types.ts';
import type { CaseNotesService } from './index.ts';
import { createPaginationParams, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { isValidRedirectUri } from '../util/uri.ts';
import type { ErrorSummaryItem } from '@pins/crowndev-lib/util/types.ts';
import { popSessionData } from '../util/session.ts';
import path from 'node:path';
import { isAuditEnabled } from '../audit/record.ts';

/** Notes as queried for mapping — no relations; author is a plain Entra ID string. */
type NoteForMapping = Pick<Prisma.ApplicationNoteGetPayload<object>, 'comment' | 'createdAt' | 'userId'>;

export interface ApplicationNote {
	id: string;
	comment: string;
	createdAt: Date;
	userId: string;
	crownDevelopmentId: string | null;
	s62aId: string | null;
}

/**
 * Maps raw application notes into the shape consumed by the case notes views.
 *
 * Author names are resolved from all Entra group members, mirroring how CROWN resolves `updatedById` for last-modified-by.
 * Falls back to the raw Entra ID, then 'Unknown'.
 */
export const mapNotes = (unmappedNotes: NoteForMapping[], groupMembers: EntraGroupMembers, readMoreHref: string) => {
	// Sort newest first (defensive — queries already order by createdAt desc).
	const notes = [...unmappedNotes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	const members = Object.values(groupMembers).flat();

	return {
		caseNotes: notes.map((note) => {
			const user = members.find((member) => member.id === note.userId);

			return {
				date: formatDateForDisplay(note.createdAt, { format: 'd MMMM yyyy' }),
				dayOfWeek: formatDateForDisplay(note.createdAt, { format: 'EEEE' }),
				time: formatDateForDisplay(note.createdAt, { format: 'h:mmaaa' }),
				commentText: nl2br(escape(note.comment)),
				truncatedCommentText:
					nl2br(escape(truncateComment(note.comment, CASE_NOTE_MAX_LENGTH))) +
					(shouldTruncateComment(note.comment, CASE_NOTE_MAX_LENGTH) ? truncatedReadMoreCommentLink(readMoreHref) : ''),
				userName: user?.displayName || note.userId || 'Unknown'
			};
		})
	};
};

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
		throw error;
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

		if (!comment) {
			throw new Error('comment required');
		}

		const userId = req?.session?.account?.localAccountId;

		if (!userId) {
			throw new Error('user Id is required');
		}

		try {
			await createCaseNote(id, comment, userId, db, logger, dataModel);

			if (isAuditEnabled(service, dataModel) && service.audit) {
				await service.audit.record(
					{
						caseId: id,
						action: AUDIT_ACTIONS.CASE_NOTE_ADDED,
						userId,
						metadata: { caseNote: comment }
					},
					dataModel
				);
			}

			logger.info({ id }, 'application note created');

			if (dataModel === 'crown') {
				res.redirect(`${getBaseUrl(req.baseUrl)}${id}`);
			} else if (dataModel === 's62a') {
				res.redirect(`${getBaseUrl(req.baseUrl)}${id}/case-notes`);
			}
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
		const id = getStringParam(req.params, 'id');

		const sessionCaseData = req.session?.cases?.[id];
		if (sessionCaseData?.updateErrors) {
			res.locals.errorSummary = sessionCaseData.updateErrors as ErrorSummaryItem[];
			delete sessionCaseData.updateErrors;
		}

		let caseRow;
		try {
			if (dataModel === 'crown') {
				caseRow = await crownCaseNotes(db, id);
			} else if (dataModel === 's62a') {
				caseRow = await s62aCaseNotes(db, id);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching application details for notes',
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

		const { pageSize, skipSize } = getPaginationParams(req);
		const noteWhereCriteria = dataModel === 'crown' ? { crownDevelopmentId: id } : { s62aId: id };

		let rawNotes: ApplicationNote[] = [];
		let totalItems = 0;

		try {
			[rawNotes, totalItems] = await Promise.all([
				db.applicationNote.findMany({
					where: noteWhereCriteria,
					orderBy: {
						createdAt: 'desc'
					},
					skip: skipSize,
					take: pageSize
				}),
				db.applicationNote.count({ where: noteWhereCriteria })
			]);
		} catch (error: unknown) {
			if (error instanceof Error) {
				wrapPrismaError({
					error,
					logger,
					message: 'fetching application notes',
					logParams: { id }
				});
			}
		}

		const readMoreHref =
			dataModel === 'crown' ? `/cases/${caseRow.id}/application-notes` : `/s62a/cases/${caseRow.id}/case-notes`;

		let notes;
		try {
			notes = mapNotes(rawNotes, groupMembers, readMoreHref);
		} catch (error: unknown) {
			logger.error({ error, id }, 'Failed to map case notes');
			if (next) {
				return next(error instanceof Error ? error : new Error('Unknown error mapping notes'));
			}
			return;
		}

		if (!notes) {
			if (next) return next(new Error('Notes could not be mapped'));
			return;
		}

		res.locals.caseNoteData = notes.caseNotes;
		res.locals.caseNotePaginationParams = createPaginationParams(req, totalItems);

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

		const errorSummary = popSessionData(req, id, 'updateErrors', false);

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

		let readMoreHref: string;

		if (dataModel === 'crown') {
			readMoreHref = `/cases/${caseRow.id}/application-notes`;
		} else {
			readMoreHref = `/s62a/cases/${caseRow.id}/case-notes`;
		}

		let notes: ReturnType<typeof mapNotes>;
		try {
			notes = mapNotes(caseRow.Notes, groupMembers, readMoreHref);
		} catch (error: unknown) {
			logger.error({ error, id }, 'Failed to map case notes');
			return;
		}

		return res.render('./application-notes-view.njk', {
			pageHeading: 'Case notes',
			reference: caseRow?.reference,
			backLinkUrl: `${getBaseUrl(req.baseUrl)}${id}`,
			backLinkText: 'Back to case details',
			currentUrl: req.originalUrl,
			displayRef: true,
			errorSummary,
			...notes
		});
	};
}

export function buildViewAddCaseNotes(service: CaseNotesService, dataModel: CaseDataModel): AsyncRequestHandler {
	const { db, logger, getEntraClient } = service;
	const groupIds = service.entraGroupIds;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');

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

		const currentPath = req.originalUrl.split('?')[0];
		const parentPath = path.posix.dirname(currentPath);
		const cleanCurrentUrl = isValidRedirectUri(parentPath) ? parentPath : '/';

		const sessionComment = popSessionData(req, id, 'sessionComment', false, 'cases') || '';
		const errorSummary = popSessionData(req, id, 'updateErrors', false);

		return res.render(
			'add-case.njk',
			{
				backLinkUrl: cleanCurrentUrl,
				backLinkText: 'Back',
				currentUrl: cleanCurrentUrl,
				displayRef: true,
				errorSummary,
				sessionComment,
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
