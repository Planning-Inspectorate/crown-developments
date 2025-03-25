import { Router as createRouter } from 'express';
import { buildContactUsPage } from './controller.js';

export function createRoutes() {
	const router = createRouter({ mergeParams: true });
	const contactUsPage = buildContactUsPage();
	router.get('/', contactUsPage);

	return router;
}
