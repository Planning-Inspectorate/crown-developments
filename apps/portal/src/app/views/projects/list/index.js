import { Router as createRouter } from 'express';

/**
 * @param {Object} opts
 * @param {import('../../../config-types.js').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @returns {import('express').Router}
 */
export function createRoutes() {
	const router = createRouter();

	router.get('/', (req, res) =>
		res.render('views/projects/list/view.njk', {
			pageTitle: 'List of Projects',
			projects: [{ name: 'Project One', id: 'project-1', applicant: 'Some Dept.', status: 'TBC' }]
		})
	);

	return router;
}
