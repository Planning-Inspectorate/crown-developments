import { test } from '@playwright/test';
import { CasesPage } from '../page-objects/cases.page.ts';

test('authenticated user can view the cases page', async ({ page }) => {
	const casesPage = new CasesPage(page);

	await casesPage.actions.goto();
	await casesPage.assertions.isPageDisplayed();
});
