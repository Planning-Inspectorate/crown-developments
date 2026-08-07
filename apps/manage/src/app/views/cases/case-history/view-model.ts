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

/** * Transforms raw audit events into rows ready for the case history table. */
export function createCaseHistoryViewModel(events: Array<AuditEvent & { userName: string }>): CaseHistoryRow[] {
	return events.map((event) => {
		const { action, metadata, createdAt, userName } = event;
		const dateTimeFormatted = formatDateTime(new Date(createdAt));

		if (!isAuditAction(action)) {
			return { dateTimeFormatted, details: `Unknown action: ${action}`, user: userName };
		}

		const details = resolveTemplate(action, metadata ?? undefined);
		const isLong = metadata?.isLong === true;

		return {
			dateTimeFormatted,
			details,
			user: userName,
			...(isLong && {
				longField: {
					fieldName: typeof metadata?.fieldName === 'string' ? metadata.fieldName : '',
					oldValue: typeof metadata?.oldValue === 'string' ? metadata.oldValue : '',
					newValue: typeof metadata?.newValue === 'string' ? metadata.newValue : ''
				}
			})
		};
	});
}
