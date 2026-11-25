import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { NextFunction, Request, Response } from 'express';
import { onlySectionsOfTheTab, onlyTabsWithOneSection } from './index.ts';

/** Runs a guard, returning what it passed to next and the params it left */
function runGuard(
	guard: (req: Request, res: Response, next: NextFunction) => void,
	params: Record<string, string>
): { nextArg: unknown; params: Record<string, string> } {
	const req = { params: { ...params } } as unknown as Request;
	let nextArg: unknown = 'not called';
	guard(req, {} as Response, (arg?: unknown) => {
		nextArg = arg;
	});
	return { nextArg, params: req.params as Record<string, string> };
}

describe('S62A case view question route guards', () => {
	describe('onlySectionsOfTheTab (routes under the tab)', () => {
		it("applies to a tab's own section, e.g. /residential/existing/has-existing", () => {
			assert.strictEqual(
				runGuard(onlySectionsOfTheTab, { tab: 'residential', section: 'existing' }).nextArg,
				undefined
			);
		});

		it('still applies to the older /dates/dates/application-valid form', () => {
			assert.strictEqual(runGuard(onlySectionsOfTheTab, { tab: 'dates', section: 'dates' }).nextArg, undefined);
		});

		it('skips a question taken as a section, e.g. /dates/application-valid/remove', () => {
			assert.strictEqual(
				runGuard(onlySectionsOfTheTab, { tab: 'dates', section: 'application-valid' }).nextArg,
				'route'
			);
		});
	});

	describe('onlyTabsWithOneSection (routes under the case)', () => {
		it('applies to a tab with one section, and sets the tab from it', () => {
			const { nextArg, params } = runGuard(onlyTabsWithOneSection, { section: 'dates', question: 'application-valid' });

			assert.strictEqual(nextArg, undefined);
			assert.strictEqual(params.tab, 'dates');
		});

		it("skips the residential tab's sections, whose urls keep the tab", () => {
			for (const section of ['residential', 'existing', 'proposed']) {
				assert.strictEqual(runGuard(onlyTabsWithOneSection, { section }).nextArg, 'route', section);
			}
		});

		it('skips anything that is not a tab', () => {
			assert.strictEqual(runGuard(onlyTabsWithOneSection, { section: 'case-folders' }).nextArg, 'route');
		});
	});
});
