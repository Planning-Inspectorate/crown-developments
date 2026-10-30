import { extname } from 'node:path';
import type { ServeStaticOptions } from 'serve-static';

/**
 * Allow cross-origin access to public assets (CSS, fonts, icons) so that
 * other services like MS Clarity can load them.
 */
const publicAssetExtensions = new Set(['.css', '.woff', '.woff2', '.png', '.svg', '.ico']);

export function publicAssetOptions<T extends ServeStaticOptions>(
	options: T
): T & { setHeaders: NonNullable<ServeStaticOptions['setHeaders']> } {
	return {
		...options,
		setHeaders(res, filePath, stat) {
			options.setHeaders?.(res, filePath, stat);
			if (publicAssetExtensions.has(extname(filePath).toLowerCase())) {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
			}
		}
	};
}
