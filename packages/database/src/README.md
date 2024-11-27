# Database

This project uses a SQL database for data. It uses [Prisma](https://www.prisma.io/) as an ORM. The schema is in this folder: [schema.prisma](./schema.prisma).

## Schema Changes

To update the schema, follow these steps:

1. Make changes to the `schema.prisma` file, see [Field Types](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#model-field-scalar-types) and associated Prisma documentation.
2. Run `npm run db-migrate-dev` in the root package, this will prompt for a migration name (this can include spaces, they'll be replaced with underscores)
3. Commit the schema + migration script

## Comments

Prisma schemas support comments, please add them to any models and fields/columns to explain the purpose and any important context. Comments that are only relevant in the context of the schema should start with `//`, comments that are relevant to users of the model should use `///`. Comments with `///` will end up in the generated type definitions, which is useful for users of the models. See https://www.prisma.io/docs/concepts/components/prisma-schema#comments.

## IDs

We use GUIDs for IDs (see https://learn.microsoft.com/en-us/sql/t-sql/data-types/uniqueidentifier-transact-sql?view=sql-server-ver16) this is because these IDs may be used in URLs and it makes them harder to guess. While we don't rely on that for security, it adds an extra layer. While not everything needs this, it is easier to make them all consistent and the increase in size (vs int) is negligible.

To add a model with a GUID ID field, use:

`@id @default(dbgenerated("newid()")) @db.UniqueIdentifier`

The meanings of these tags are:
* `@id` - this is an ID field (PRIMARY KEY)
* `@default(dbgenerated("newid()"))` - the default value is the native `newid()` function
* `@db.UniqueIdentifier` - the field type is a specific string type, UniqueIdentifier (see https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#microsoft-sql-server)

## Conventions

We follow Prisma's suggested conventions, see [naming-conventions](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#naming-conventions). At a high-level:

* Model names should use PascalCase, e.g. `AppealUser`
* Column names should use camelCase, e.g. `AppealUser.serviceUserId`
* Relation names should use PascalCase, e.g. `AppealUser.SecurityToken`

## Strings

The default `String` type in Prisma is `nvarchar(1000)` in MSSQL. Use a more specific type if you need a larger (or smaller) string, by adding an `@db.` attribute, such as `@db.NVarChar(2000)`. See [prisma-schema-reference#microsoft-sql-server](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#microsoft-sql-server).
