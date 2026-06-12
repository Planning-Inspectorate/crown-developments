# Playwright Test Automation Framework

This project uses Playwright with TypeScript for end-to-end testing.

The framework includes:

* Playwright Test
* TypeScript
* Prettier
* Microsoft authentication using Playwright `storageState`
* Page Object Model structure
* Reusable page utilities
* Support files for setup and shared helpers


## Folder purpose

| Folder                      | Purpose                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| `playwright/.auth`          | Stores generated authentication state files, such as `admin.json`.             |
| `playwright/downloads`      | Stores downloaded files and test output where needed.                          |
| `playwright/fixtures`       | Stores custom Playwright fixtures.                                             |
| `playwright/page-objects`   | Stores page object classes that represent pages, components, or user journeys. |
| `playwright/page-utilities` | Stores reusable helper functions used by page objects and tests.               |
| `playwright/support`        | Stores shared setup files, including `global.setup.ts`.                        |
| `playwright/tests`          | Stores Playwright test files.                                                  |
| `playwright/types`          | Stores shared TypeScript types.                                                |

## Installation

Install project dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

## Environment variables

Create a `.env` file in the root of the project.

```env
BASE_URL=https://your-app-url-here
ADMIN_USERNAME=your-email@example.com
ADMIN_PASSWORD=your-password
```

These values are used by the Playwright global setup file to log in before the tests run.

Do not commit the `.env` file to source control.

## Authentication

Authentication is handled using Playwright global setup.

The setup file is located at:

```text
playwright/support/global.setup.ts
```

The Microsoft login page object is located at:

```text
playwright/page-objects/login-microsoft.page.ts
```

During setup, Playwright logs in through the Microsoft login page and saves the authenticated browser state to:

```text
playwright/.auth/admin.json
```

The saved storage state is then reused by tests through `playwright.config.ts`.

This means tests can open protected pages without repeating the Microsoft login journey in every test.

## Running tests

Run all Playwright tests:

```bash
npm run test:playwright
```

Run tests in headed mode:

```bash
npm run test:playwright:headed
```

Run tests using the Playwright UI:

```bash
npm run test:playwright:ui
```

Run tests in debug mode:

```bash
npm run test:playwright:debug
```

Run a specific test file:

```bash
npx playwright test playwright/tests/example.spec.ts
```

Run tests for a specific browser project:

```bash
npx playwright test --project=chromium
```

Open the latest HTML report:

```bash
npx playwright show-report
```

## Recommended package scripts

The `package.json` file should include these scripts:

```json
{
  "scripts": {
    "test:playwright": "playwright test",
    "test:playwright:headed": "playwright test --headed",
    "test:playwright:ui": "playwright test --ui",
    "test:playwright:debug": "playwright test --debug",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## Page objects

Page objects should be stored in:

```text
playwright/page-objects
```

Example:

```text
playwright/page-objects/login-microsoft.page.ts
```

Page objects should contain page-specific locators and actions.

Example:

```ts
import type { Page } from '@playwright/test';

export class ExamplePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async getPageTitle(): Promise<string> {
    return await this.page.locator('h1').innerText();
  }
}
```

## Page utilities

Page utilities should be stored in:

```text
playwright/page-utilities
```

Use this folder for reusable helpers that are not tied to one specific page object.

Examples:

```text
playwright/page-utilities/downloads.ts
playwright/page-utilities/zip.ts
playwright/page-utilities/date.ts
playwright/page-utilities/url.ts
```

A utility file might contain shared logic such as reading ZIP files, clearing download folders, formatting dates, or building URLs.

## Tests

Tests should be stored in:

```text
playwright/tests
```

Test files should use the `.spec.ts` extension.

Examples:

```text
playwright/tests/homepage.spec.ts
playwright/tests/authenticated-user.spec.ts
playwright/tests/case-details.spec.ts
```

## Reports, screenshots, traces and videos

Playwright generates an HTML report after test runs.

Open the report with:

```bash
npx playwright show-report
```

The framework is configured to keep:

* traces on first retry
* screenshots only on failure
* videos on failure

These settings can be changed in `playwright.config.ts`.


## Useful Playwright commands

Run all tests:

```bash
npx playwright test
```

Run tests in headed mode:

```bash
npx playwright test --headed
```

Run tests in debug mode:

```bash
npx playwright test --debug
```

Run Playwright UI mode:

```bash
npx playwright test --ui
```

## Notes

* Do not commit secrets, passwords, or generated authentication state files.
* Keep `.env` local.
* Keep page objects small and focused.
* Move repeated helper logic into `playwright/page-utilities`.
* Prefer readable tests that describe user behaviour.
