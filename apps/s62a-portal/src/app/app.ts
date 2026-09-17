import type { S62APortalService } from '#service';
import { configureNunjucks } from './nunjucks.ts';
import { buildRouter } from './router.ts';
import manifest from '../.static/manifest.json' with { type: 'json' };
import { addLocalsConfiguration } from '../util/config-middleware.ts';
import { createBaseApp } from '@planning-inspectorate/core/app';

const manifestEntries = manifest as Record<string, string>;

export function createApp(service: S62APortalService) {
	const router = buildRouter(service);
	return createBaseApp({
		service,
		router,
		configureNunjucks,
		middlewares: [
			addLocalsConfiguration(service),
			(req, res, next) => {
				//TODO - investigate manifest type issues on PR pipeline
				res.locals.styleCss = manifestEntries['style.css'] ?? 'style.css';
				next();
			}
		]
	});
}
