import { Router as createRouter } from 'express';
import { viewHomepage } from './views/home/controller.js';

/**
 * @returns {import('express').Router}
 */
export function buildRouter() {
	const router = createRouter();

	router.route('/').get(viewHomepage);

	return router;
}
