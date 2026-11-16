import type { ManageService } from '#service';
import type { RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';

/**
 * Checks if a token is valid, uses timingSafeEqual to protect
 * against brute force attacks
 */
function isValidToken(provided: string, expected: string): boolean {
	const providedBuf = Buffer.from(provided, 'utf8');
	const expectedBuf = Buffer.from(expected, 'utf8');

	if (providedBuf.byteLength !== expectedBuf.byteLength) {
		return false;
	}

	return timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Generic token validator that checks for a key before allowing the request
 * to pass to the next middleware
 */
export function buildTokenValidator<T extends keyof ManageService>(service: ManageService, key: T): RequestHandler {
	return (req, res, next) => {
		const expected = service[key];
		if (typeof expected !== 'string' || !expected) {
			service.logger.warn(`${String(key)} is not set in service`);
			return res.status(500).send('Server misconfigured');
		}

		const authHeader = req.headers.authorization;
		const token = authHeader?.split(' ')[1];

		if (!token || !isValidToken(token, expected)) {
			service.logger.warn('Invalid or missing authorization token in request');
			return res.status(401).send('Unauthorized access');
		}

		return next();
	};
}
