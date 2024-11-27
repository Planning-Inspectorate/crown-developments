# Crown Developments

This repository is for the Crown Developments service, and includes all components including the infrastructure-as-code and the applications.

## Dev Setup

To get started, ensure you Node v22 (`nvm install 22`) installed. Then run:

`npm ci`

to install all dependencies (the repo is setup with workspaces, this will install dependencies for all apps and packages).

### Environment settings

The applications require configuation to run, and these are set via environment variables. These can be set using run configurations, or using a `.env` file. There is a `.env.example` file to get started with in each app directory.

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

## Licensing

[MIT](https://opensource.org/licenses/mit) © Planning Inspectorate
