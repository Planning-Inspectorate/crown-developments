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
		if (
			action === AUDIT_ACTIONS.LONG_FIELD_SET ||
			action === AUDIT_ACTIONS.LONG_FIELD_UPDATED ||
			action === AUDIT_ACTIONS.LONG_FIELD_CLEARED
		) {
			const oldValue = typeof metadata?.oldValue === 'string' ? metadata.oldValue : '';
			const newValue = typeof metadata?.newValue === 'string' ? metadata.newValue : '';

			const longDetails = [
				{
					label: `Previous ${fieldName}`,
					value: action === AUDIT_ACTIONS.LONG_FIELD_SET ? '' : oldValue
				},
				{
					label: `New ${fieldName}`,
					value: action === AUDIT_ACTIONS.LONG_FIELD_CLEARED ? '' : newValue
				}
			].filter((detail) => detail.value);

			return {
				dateTimeFormatted,
				details,
				user: userName,
				action,
				longDetails: longDetails.length > 0 ? longDetails : undefined
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
