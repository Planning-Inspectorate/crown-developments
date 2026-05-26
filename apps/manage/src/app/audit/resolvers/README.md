# Audit Resolvers

This directory is for **resolvers** that translate raw database and form data into human-readable audit entries.

> **Status: not yet implemented.** This directory is currently empty. The audit
> system today records only simple, self-describing events (e.g. `CASE_CREATED`)
> whose metadata is supplied directly at the call site. Resolvers will be added
> when the audit trail is extended to cover field-level and list changes. This
> README describes the intended pattern for that work — it does not describe code
> that exists yet.

## Why resolvers will exist

When a user saves a form, the raw data is database IDs, field keys, and values. An audit trail should read _"Status was updated from New to Accepted"_, not _"statusId was updated from new to accepted"_. A resolver knows how to translate one type of field from raw data into something a person can read.

## Intended pattern

### Field resolvers (scalar fields)

For simple scalar fields on the `CrownDevelopment` model (status, procedure, case officer, etc.), a field resolver would take the old DB value and the new form value and return display-friendly `{ oldValue, newValue }` strings. Fields without a specific resolver would fall through to a default that stringifies the raw value.

### List resolvers (one-to-many relationships)

For one-to-many relationships, a list resolver would compare the old and new lists, determine what was added, removed, or changed, and produce the appropriate audit entries for each difference. Each entity type would get its own resolver.

## When you add resolver support for a new field or entity

1. **Add audit action(s)** in `audit/actions.ts` (e.g. `MY_ENTITY_ADDED`, `MY_ENTITY_UPDATED`, `MY_ENTITY_DELETED`).
2. **Add matching templates** in `AUDIT_TEMPLATES` in the same file.
3. **Create the resolver here** — a field resolver for a scalar field, or a new list resolver for a new entity type.
4. **Wire it into the relevant save/update controller** so the resolver runs after the database write and the resulting entries are passed to `audit.recordMany()`.

Update this README's status note once the first resolver lands.