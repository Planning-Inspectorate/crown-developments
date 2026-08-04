import { formatDateTime } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { isAuditAction, resolveTemplate } from '../../../audit/actions.ts';
import type { AuditEvent } from '../../../audit/types.ts';
import { getFieldDisplayName } from '../../../audit/resolvers/index.ts';

/**
 * Field keys whose values are too long to display inline.
 * Rendered in expandable govukDetails components instead of inline text.
 */
const LONG_FIELD_DISPLAY_NAMES = new Set(['description', 'healthAndSafetyIssue'].map(getFieldDisplayName));

export interface LongFieldData {
	oldValue: string;
	newValue: string;
}

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
	longField?: LongFieldData;
}

/**
 * Transforms raw audit events into rows ready for the case history table.
 */
export function createCaseHistoryViewModel(events: Array<AuditEvent & { userName: string }>): CaseHistoryRow[] {
	return events.map((event) => {
		const { action, metadata, createdAt, userName } = event;
		const storedFieldName = metadata?.fieldName as string | undefined;
		const isLongField = storedFieldName && LONG_FIELD_DISPLAY_NAMES.has(storedFieldName);

		return {
			dateTimeFormatted: formatDateTime(new Date(createdAt)),
			details: isLongField
				? `${storedFieldName} was updated`
				: isAuditAction(action)
					? resolveTemplate(action, metadata ?? undefined)
					: `Unknown action: ${action}`,
			user: userName,
			...(isLongField && {
				longField: {
					oldValue: (metadata?.oldValue as string) || '-',
					newValue: (metadata?.newValue as string) || ''
				}
			})
		};
	});
}
