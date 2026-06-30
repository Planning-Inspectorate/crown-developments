import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { Logger } from 'pino';
import { parseMetadata, type AuditEntry, type AuditEvent, type AuditQueryOptions } from './types.ts';
import { CASE_MODELS, type CaseDataModel } from '../util/types.ts';
import type { EntraGroupMembers } from '../util/entra-groups.ts';
import { formatDateTime } from '../util/audit-formatters.ts';

/**
 * Builds the audit service used to record and retrieve case history events.
 *
 * Design notes:
 *   - `record()` is fire-and-forget: audit failures are logged but never
 *     thrown so they can't break the user's actual operation.
 */
export function buildAuditService(db: PrismaClient, logger: Logger) {
	return {
		/**
		 * Persist a single audit event.
		 *
		 * Safe to call without awaiting if the caller doesn't need
		 * confirmation, but awaiting is fine too
		 */
		async record(entry: AuditEntry, dataModel: CaseDataModel): Promise<void> {
			const model = CASE_MODELS[dataModel];
			if (!model) throw new Error(`Unsupported data model: ${String(dataModel)}`);

			try {
				if (!entry.userId) {
					throw new Error('Cannot record audit event without a userId');
				}

				await db.$transaction(async (tx) => {
					await tx.applicationHistory.create({
						data: {
							[model.relation]: {
								connect: { id: entry.caseId }
							},
							action: entry.action,
							metadata: JSON.stringify(entry.metadata ?? {}),
							userId: entry.userId as string
						}
					});

					await model.delegate(tx as PrismaClient).update({
						where: { id: entry.caseId },
						data: {
							updatedDate: new Date(),
							updatedById: entry.userId
						}
					});
				});
			} catch (error) {
				logger.error(
					{
						error,
						action: entry.action,
						caseId: entry.caseId
					},
					'Failed to record audit event'
				);
			}
		},

		/**
		 * Persist multiple audit entries in a single transaction.
		 *
		 * This avoids deadlocks that occur when many concurrent transactions
		 * each try to update the same database model row (e.g. bulk file
		 * moves with up to 100 files, or case updates that produce many
		 * field-level audit entries).
		 *
		 * All caseHistory rows are created individually, then a single
		 * databaseModel.update sets updatedDate/updatedById once at the end.
		 */
		async recordMany(entries: AuditEntry[], dataModel: CaseDataModel): Promise<void> {
			if (entries.length === 0) return;
			const model = CASE_MODELS[dataModel];
			if (!model) throw new Error(`Unsupported data model: ${String(dataModel)}`);

			try {
				const caseId = entries[0].caseId;
				const userId = entries[0].userId;

				const missingUser = entries.find((e) => !e.userId);
				if (missingUser) {
					throw new Error(`Cannot record audit events: entry for case ${missingUser.caseId} has no userId`);
				}

				await db.$transaction(async (tx) => {
					await tx.applicationHistory.createMany({
						data: entries.map((entry) => ({
							[model.fk]: entry.caseId,
							action: entry.action,
							metadata: JSON.stringify(entry.metadata ?? {}),
							userId: entry.userId as string
						}))
					});

					await model.delegate(tx as PrismaClient).update({
						where: { id: caseId },
						data: { updatedDate: new Date(), updatedById: userId }
					});
				});
			} catch (error) {
				logger.error(
					{
						error,
						caseId: entries[0].caseId,
						entryCount: entries.length
					},
					'Failed to record audit events'
				);
			}
		},

		/**
		 * Retrieve audit events for a case, newest first.
		 */
		async getAllForCase(caseId: string, dataModel: CaseDataModel, options?: AuditQueryOptions): Promise<AuditEvent[]> {
			const { skip = 0, take = 50 } = options ?? {};
			const model = CASE_MODELS[dataModel];
			if (!model) throw new Error(`Unsupported data model: ${String(dataModel)}`);

			try {
				const events = await db.applicationHistory.findMany({
					where: { [model.fk]: caseId },
					orderBy: { createdAt: 'desc' },
					skip,
					take
				});

				// Parse the metadata JSON string into an object
				return events.map((event) => ({
					...event,
					metadata: parseMetadata(event.metadata)
				}));
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to fetch audit events'
				);

				// Returns an empty array on failure so the history page can still
				// render (with an appropriate message) rather than 500-ing.
				return [];
			}
		},

		/**
		 * Count total audit events for a case.
		 */
		async countForCase(caseId: string, dataModel: CaseDataModel): Promise<number> {
			const model = CASE_MODELS[dataModel];
			if (!model) throw new Error(`Unsupported data model: ${String(dataModel)}`);

			try {
				return await db.applicationHistory.count({
					where: { [model.fk]: caseId }
				});
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to count audit events'
				);

				return 0;
			}
		},

		/**
		 * Get last modified information for display in case summary.
		 * Returns formatted data ready for the UI.
		 */
		async getLastModifiedInfo(
			caseId: string,
			groupMembers: EntraGroupMembers,
			dataModel: CaseDataModel
		): Promise<{
			updatedDate: string | null;
			by: string | null;
		}> {
			const model = CASE_MODELS[dataModel];
			if (!model) throw new Error(`Unsupported data model: ${String(dataModel)}`);

			try {
				const caseRow = await model.delegate(db).findUnique({
					where: { id: caseId },
					select: {
						updatedDate: true,
						updatedById: true
					}
				});

				if (!caseRow) {
					throw new Error(`No case found for id: ${caseId}`);
				}

				const updatedDate = caseRow.updatedDate ? formatDateTime(caseRow.updatedDate) : null;

				const allMembers = [...groupMembers.caseOfficers, ...groupMembers.inspectors];
				const user = allMembers.find((member) => member.id === caseRow.updatedById);

				// 1. Try and get a user from entra and show their name
				// 2. Otherwise just show the updatedById (Entra ID) in plain text
				// 3. Otherwise show Unknown
				const userName = user?.displayName || caseRow.updatedById || 'Unknown';

				return {
					updatedDate,
					by: userName
				};
			} catch (error) {
				logger.error(
					{
						error,
						caseId
					},
					'Failed to fetch last modified info'
				);
				return { updatedDate: null, by: null };
			}
		}
	};
}

export type AuditService = ReturnType<typeof buildAuditService>;
