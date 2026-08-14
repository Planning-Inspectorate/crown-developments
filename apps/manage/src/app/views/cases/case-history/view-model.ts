import { formatDateTime } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { AUDIT_ACTIONS, isAuditAction, resolveTemplate } from '../../../audit/actions.ts';
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
	action?: string;
	longDetails?: Array<{
		label: string;
		value: string;
	}>;
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
		const fieldName = typeof metadata?.fieldName === 'string' ? metadata.fieldName : '';

		if (action === AUDIT_ACTIONS.FIELD_UPDATED_LONG) {
			return {
				dateTimeFormatted,
				details,
				user: userName,
				action,
				longDetails: [
					{
						label: `Previous ${fieldName}`,
						value: typeof metadata?.oldValue === 'string' ? metadata.oldValue : ''
					},
					{
						label: `New ${fieldName}`,
						value: typeof metadata?.newValue === 'string' ? metadata.newValue : ''
					}
				].filter((detail) => detail.value)
			};
		}

		if (action === AUDIT_ACTIONS.FIELD_SET_LONG || action === AUDIT_ACTIONS.FIELD_CLEARED_LONG) {
			const rawValue = action === AUDIT_ACTIONS.FIELD_SET_LONG ? metadata?.newValue : metadata?.oldValue;
			const value = typeof rawValue === 'string' ? rawValue : '';

			const summary = action === AUDIT_ACTIONS.FIELD_SET_LONG ? `${fieldName} was set to` : `${fieldName} was removed`;

			return {
				dateTimeFormatted,
				details: summary,
				user: userName,
				action,
				longDetails: value
					? [
							{
								label: 'Show full details',
								value
							}
						]
					: undefined
			};
		}

		return {
			dateTimeFormatted,
			details,
			user: userName,
			action
		};
	});
}
