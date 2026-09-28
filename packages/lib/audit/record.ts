import type { Logger } from 'pino';
import type { AuditService } from './service.ts';
import type { AuditEntry } from './types.ts';
import type { CaseDataModel } from '../util/types.ts';

export interface RecordAuditArgs {
	/** Usually the app's service: needs audit and logger, and can switch auditing off with isAuditLive */
	service: { audit?: AuditService; logger: Logger; isAuditLive?: boolean };
	dataModel: CaseDataModel;
	/** Entries to record; nulls (nothing to record) are skipped */
	entries: ReadonlyArray<AuditEntry | null>;
	/** Extra details for the error log if recording fails, e.g. { caseId } */
	logContext?: Record<string, unknown>;
}

/**
 * Records audit entries without ever affecting the user's action.
 *
 *   - does nothing if auditing is switched off, or there's no audit service
 *   - does nothing if there's nothing to record
 *   - logs, rather than throws, if recording fails
 *
 * Call it after the action itself has succeeded.
 */
export async function recordAuditSafely({
	service,
	dataModel,
	entries,
	logContext = {}
}: RecordAuditArgs): Promise<void> {
	const { audit, logger, isAuditLive } = service;

	if (isAuditLive === false || !audit) {
		return;
	}

	const toRecord = entries.filter((entry): entry is AuditEntry => entry !== null);
	if (toRecord.length === 0) {
		return;
	}

	try {
		await audit.recordMany(toRecord, dataModel);
	} catch (error: unknown) {
		logger.error({ error, ...logContext }, 'Failed to record audit events');
	}
}
