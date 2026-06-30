# Audit Resolvers

This directory contains **resolvers** that translate raw database and form data into human-readable audit trail entries.

## Why resolvers exist

When a user saves a form, all we get is raw data — database IDs, field keys, and values. But the audit trail needs to show things like _"Inspector was updated from Alice to Bob"_, not _"inspectorId was updated from f62dd2d8-c46c-454c-9542-3e6ac8db156a to 7c4709fd-4f4e-40dc-b2b8-ffb5e9dd443d"_.

Each resolver knows how to translate one type of field from raw data into something a person can read.

## Field resolvers (`field-resolver.ts`)

Handle scalar fields on the `CrownDevelopment` model. They take the old DB value and the new form value, and return display-friendly `{ oldValue, newValue }` strings.

### Key functions

- **`resolveFieldValues(fieldName, previousCase, newAnswer)`** — looks up a field-specific resolver or falls back to the default resolver which stringifies raw values
- **`getFieldDisplayName(fieldName)`** — returns a human-readable display name using `FIELD_DISPLAY_NAMES` from `questions.js`, falling back to sentence case conversion

### Adding a new field resolver

To add special handling for a field (e.g. it needs formatting, or the form value differs from the DB column), add an entry to the `FIELD_RESOLVERS` map in `field-resolver.ts`. Fields not in the map fall through to the default resolver.

Currently registered resolvers:

| Field | Description |
|-------|-------------|
| `siteAddress` | Formats address object into comma-separated string |

### Auditable fields

Not all fields are yet audited — only those listed in `AUDITABLE_SCALAR_FIELDS` in `update-case.ts`:

- `siteArea`
- `lpaReference`
- `agentOrganisationName`
- `hearingVenue`
- `inquiryVenue`

## List resolvers

> **Not yet implemented** (see CROWN-1641). This section describes the intended pattern for when list resolvers are added.

List resolvers will handle one-to-many relationships (contacts, inspectors, etc.). They will compare the old list to the new list, determine what was added, removed, or changed, and produce the right audit entries for each difference.

## Adding audit support for a new field

When you add a new field to the case model:

1. **Add it to `AUDITABLE_SCALAR_FIELDS`** in `update-case.ts`
2. **Optionally add a field-specific resolver** in `FIELD_RESOLVERS` if the field needs special formatting
3. **Ensure the field has a display name** via a question definition (which populates `FIELD_DISPLAY_NAMES`)

For new audit actions beyond field updates:

1. **Add an audit action** in `audit/actions.ts` (e.g. `MY_ENTITY_ADDED`)
2. **Add a template** in `AUDIT_TEMPLATES` in the same file

## Shared formatters

Common formatting functions live in `packages/lib/util/audit-formatters.ts` and are shared across all resolvers:

| Function | Description |
|----------|-------------|
| `formatAddress` | Formats address object into comma-separated string |
| `formatDate` | Formats date for display (optionally with time) |
| `formatDateTime` | Formats date with time |
| `formatValue` | Formats scalar values; returns `-` for null/undefined |
| `formatNumber` | Formats numeric values |
| `formatBoolean` | Formats boolean to Yes/No |
| `formatYesNo` | Normalises 'yes'/'no' form strings to 'Yes'/'No' |
| `formatMonetaryValue` | Formats value as GBP currency |
