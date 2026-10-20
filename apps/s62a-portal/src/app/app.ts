import type { S62APortalService } from '#service';
import { configureNunjucks } from './nunjucks.ts';
import { buildRouter } from './router.ts';
import { addLocalsConfiguration } from '../util/config-middleware.ts';
import { createBaseApp } from '@planning-inspectorate/core/app';
import { loadManifest } from '@pins/crowndev-lib/util/manifest.ts';

export async function createApp(service: S62APortalService) {
	const router = buildRouter(service);
	const manifest = await loadManifest(service.staticDir, service.logger);
	return createBaseApp({
		service,
		router,
		configureNunjucks,
		multiPartFormRoutes: [
			// Multer multipart/form-data needs to be handled before Lusca CSRF check,
			// so the Have your say upload route checks CSRF itself
			/\/have-your-say\/[^/]+\/[^/]+\/upload\/?$/
		],
		middlewares: [addLocalsConfiguration(service, manifest)]
	});
}
