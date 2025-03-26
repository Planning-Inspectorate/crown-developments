import { Router as createRouter } from 'express';
import { buildTermsAndConditionsPage } from './controller.js';

export function createRoutes() {
	const router = createRouter({ mergeParams: true });
	const termsAndConditionsPage = buildTermsAndConditionsPage();
	router.get('/', termsAndConditionsPage);

	return router;
}
