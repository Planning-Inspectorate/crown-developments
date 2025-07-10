# Crown Developments

This repository is for the Crown Developments service, and includes all components including the infrastructure-as-code and the applications.

tl;dr run these commands to get started:

```
npm ci
docker compose up
npm run db-generate
npm run db-migrate-dev
npm run db-seed
```

Then run each application with `npm run dev`.

## Dev Setup

To get started, ensure you Node v22 (`nvm install 22`) installed. Then run:

`npm ci`

to install all dependencies (the repo is setup with workspaces, this will install dependencies for all apps and packages).

### Environment settings

The applications require configuation to run, and these are set via environment variables. These can be set using run configurations, or using a `.env` file. There is a `.env.example` file to get started with in each app directory.

### Database Setup

A SQL Server database server is required for the applications to run. This will start automatically with docker compose. However it is required to migrate and seed the database which can be done from scripts in the database package.

First, make sure you have a `.env` file in `./packages/database` (you can copy the `.env.example`) and it has `SQL_CONNECTION_STRING` and `SQL_CONNECTION_STRING_ADMIN` environment variables defined with details pointing to your local database server (`mssql` Docker container). These values will/can be the same for local development (admin is used for migrations, the other one for the seeding).

To set up the SQL Server with tables and some data, you will need to run the following commands (whilst the SQL Server Docker container is running using `docker compose up`. Alternatively, you can run the Docker container called 'mssql' manually using the Docker interface):

```shell
npm run db-generate
npm run db-migrate-dev
npm run db-seed 
```
* **npm run db-generate** To generate the client from the schema
* **npm run db-migrate-dev** To apply changes → Creating the database and tables (this will also run seed)
* **npm run db-seed** Populating the database with some initial data

The ORM used by the application to access SQL Server is [Prisma](https://www.prisma.io/). The schema is defined in [schema.prisma](./packages/database/src/schema.prisma).

**Note:** If the `prisma.schema` file has been updated, don't forget to run `npm run db-migrate-dev` to apply the changes.

#### SQL Azure
In Azure we have manually created a login/user with db_datareader and db_datawriter roles

The following is run against the server:

```sql
CREATE LOGIN [loginname] WITH PASSWORD = 'password';
```

The following is run against the DB:

```sql
create USER [username] for login [loginname];
ALTER ROLE db_datareader ADD MEMBER [username];
ALTER ROLE db_datawriter ADD MEMBER [username];
```

#### Azure Data Studio

[Azure Data Studio](https://learn.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio) or the [MSSQL VS code extension](https://marketplace.visualstudio.com/items?itemName=ms-mssql.mssql) can be used as a database client, to create and monitor the database contents.

Install Azure Data Studio or the VS code extension, and connect to the SQL server by using the credentials specified below:

**Server:** localhost
**Authentication type:** SQL Login
**User name:** sa
**Password:** DockerDatabaseP@22word!
**Database:** pins_crown_dev
**Trust server certificate:** True

### Running the apps

To run the apps for development, using `npm run dev` in each application directory.

## Linting

This repository uses commitlint, eslint, and prettier. This are run with git hooks and also on the CI pipeline. They can also be run directly (from root):

* `npm run commitlint`
* `npm run format` - to format all files
* `npm run format-check` - to check the format of all files
* `npm run lint` - to run eslint

## Tests

This respository uses the [Node test runner](https://nodejs.org/docs/latest-v22.x/api/test.html#test-runner). To run all tests, use `npm run test` from root.

## Infrastructure
The infrastructure is defined using [Terraform](https://www.terraform.io/). The main entry point is the `main.tf` file in the `infrastructure` directory.
To make sure the terraform code is formatted correctly, you will need to have Terraform installed. You can then run the following commands:

```shell
terraform fmt -check -diff -recursive
```

To fix any formatting issues, you can run:

```shell
terraform fmt -recursive
```

## Licensing

[MIT](https://opensource.org/licenses/mit) © Planning Inspectorate
