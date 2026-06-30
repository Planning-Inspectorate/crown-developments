# Audit

This directory contains the case history (audit) system, responsible for recording and displaying actions performed on a case.

## How it works

Significant actions produce an `AuditEntry`, which is persisted to the `ApplicationHistory` table. Events are shown on the case history page as a paginated table with date/time, details, and user columns. The case details page also shows a last-modified summary (date and user) sourced from the same data.

## Service (`service.ts`)

`buildAuditService(db, logger)` creates the audit service with the following methods:

- `record()` — persists a single audit event, then updates the case's `updatedDate`/`updatedById`. Fire-and-forget: failures are logged but never thrown, so an audit failure can't break the user's operation.
- `recordMany()` — persists multiple events plus a single case update in one transaction. Intended for operations that produce many entries at once.
- `getAllForCase()` — retrieves paginated events for a case, newest first. Returns an empty array on failure so the history page can still render.
- `countForCase()` — returns the total event count for a case. Returns 0 on failure.
- `getLastModifiedInfo()` — returns the formatted last-modified date and resolved user display name for the case summary card.

User identities are stored as raw Entra IDs. Display names are resolved at read time by matching the stored ID against Entra group members (case officers and inspectors); an unmatched ID falls back to the raw ID, then to "Unknown".

## Actions & templates (`actions.ts`)

- `AUDIT_ACTIONS` defines the available action types.
- `AUDIT_TEMPLATES` maps each action to a human-readable template string with `{placeholder}` syntax.
- `resolveTemplate()` replaces placeholders with values from the event's metadata at display time. Unknown placeholders are left as-is.

Currently the only action is `CASE_CREATED` (`'{reference} was created'`).

## Types (`types.ts`)

- `AuditEntry` — input for recording an event. `metadata` is an intentionally loose key-value bag so different actions can carry different data without a schema migration per action type.
- `AuditEvent` — an event as returned from the database, with parsed metadata.
- `AuditQueryOptions` — pagination options (`skip`, `take`).

## Example

```typescript
await audit.record({
    caseId: 'case-123',
    action: AUDIT_ACTIONS.CASE_CREATED,
    userId: 'user-456',
    metadata: { reference: 'CROWN/2026/0000001' }
});
// Produces: "CROWN/2026/0000001 was created"
```

## Adding a new audit action

1. Add the action key to `AUDIT_ACTIONS` in `actions.ts`.
2. Add a matching template to `AUDIT_TEMPLATES` in the same file, using `{placeholder}` syntax for any metadata values.
3. Record it with metadata keys matching the template placeholders.
