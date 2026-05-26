import { formatDateTime } from '@pins/crowndev-lib/util/audit-formatters.ts';
<<<<<<< HEAD
import { isAuditAction, resolveTemplate } from '../../../audit/actions.ts';
import type { AuditEvent } from '../../../audit/types.ts';

export interface CaseHistoryRow {
	/** Formatted date+time, e.g. "11 February 2026 2:31pm" */
	dateTimeFormatted: string;
=======
import { resolveTemplate, type AuditAction } from '../../../audit/actions.ts';
import { BULK_FILE_ACTIONS, type AuditEvent } from '../../../audit/types.ts';

export interface CaseHistoryRow {
	/** Formatted date+time, e.g. "11 February 2026 2:31pm" */
	dateTime: string;
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
	/**
	 * Human-readable detail from the audit template.
	 * May contain HTML for bulk file entries (show/hide toggle).
	 * Rendered via `html` not `text` in the Nunjucks table.
	 */
	details: string;
	/** Display name of the user who performed the action */
	user: string;
<<<<<<< HEAD
=======
	/** File names for bulk file actions — rendered as show/hide in the template */
	files?: string[];
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
}

/**
 * Transforms raw audit events into rows ready for the case history table.
 */
export function createCaseHistoryViewModel(events: Array<AuditEvent & { userName: string }>): CaseHistoryRow[] {
	return events.map((event) => {
		return {
<<<<<<< HEAD
			dateTimeFormatted: formatDateTime(new Date(event.createdAt)),
			details: isAuditAction(event.action)
				? resolveTemplate(event.action, event.metadata ?? undefined)
				: `Unknown action: ${event.action}`,
			user: event.userName
=======
			dateTime: formatDateTime(new Date(event.createdAt)),
			details: resolveTemplate(event.action as AuditAction, event.metadata ?? undefined),
			user: event.userName,
			files:
				BULK_FILE_ACTIONS.has(event.action) && Array.isArray(event.metadata?.files)
					? (event.metadata.files as string[])
					: undefined
>>>>>>> 07ff7f55 (feat(manage): case history page and other impl)
		};
	});
}
