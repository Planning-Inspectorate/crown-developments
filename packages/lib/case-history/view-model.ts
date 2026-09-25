import { formatDateTime } from '../util/audit-formatters.ts';
import { AUDIT_ACTIONS, LONG_FIELD_ACTIONS, isAuditAction, resolveTemplate } from '../audit/actions.ts';
import type { AuditEvent } from '../audit/types.ts';
import type { CaseDataModel } from '../util/types.ts';

export interface CaseHistoryRow {
	/** Formatted date+time, e.g. "11 February 2026 2:31pm" */
	dateTimeFormatted: string;
	/**
	 * Human-readable detail from the audit template. Plain text: the view
	 * escapes it and turns line breaks into <br>.
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
export function createCaseHistoryViewModel(
	events: Array<AuditEvent & { userName: string }>,
	dataModel: CaseDataModel
): CaseHistoryRow[] {
	return events.map((event) => {
		const { action, metadata, createdAt, userName } = event;
		const dateTimeFormatted = formatDateTime(new Date(createdAt));

		if (!isAuditAction(dataModel, action)) {
			return { dateTimeFormatted, details: `Unknown action: ${action}`, user: userName };
		}

		const details = resolveTemplate(dataModel, action, metadata ?? undefined);
		const fieldName = typeof metadata?.fieldName === 'string' ? metadata.fieldName : '';

		if (LONG_FIELD_ACTIONS.has(action)) {
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
