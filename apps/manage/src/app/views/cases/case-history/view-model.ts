import { formatDateTime } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { isAuditAction, resolveTemplate } from '../../../audit/actions.ts';
import type { AuditEvent } from '../../../audit/types.ts';

export interface CaseHistoryRow {
	/** Formatted date+time, e.g. "11 February 2026 2:31pm" */
	dateTimeFormatted: string;
	/**
	 * Human-readable detail from the audit template.
	 * May contain HTML for bulk file entries (show/hide toggle).
	 * Rendered via `html` not `text` in the Nunjucks table.
	 */
	details: string;
	/** Display name of the user who performed the action */
	user: string;
}

/**
 * Transforms raw audit events into rows ready for the case history table.
 */
export function createCaseHistoryViewModel(events: Array<AuditEvent & { userName: string }>): CaseHistoryRow[] {
	return events.map((event) => {
		return {
			dateTimeFormatted: formatDateTime(new Date(event.createdAt)),
			details: isAuditAction(event.action)
				? resolveTemplate(event.action, event.metadata ?? undefined)
				: `Unknown action: ${event.action}`,
			user: event.userName
		};
	});
}
