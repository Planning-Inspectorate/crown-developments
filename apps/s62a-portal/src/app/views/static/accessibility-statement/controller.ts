import type { Request, Response } from 'express';

/**
 * Builds the Accessibility Statement page controller.
 */
export function buildAccessibilityStatementPage() {
	return (req: Request, res: Response) => {
		res.render('views/static/accessibility-statement/view.njk', {
			pageTitle: 'Accessibility statement',
			pageHeading: 'Accessibility statement'
		});
	};
}
