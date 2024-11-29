/**
 * @template A
 * @template B
 * @template C
 * @template D
 * @template {Record<string, any>} E
 *
 * @param {import('express').RequestHandler<A, B, C, D, E>} requestHandler
 * @returns {import('express').RequestHandler<A, B, C, D, E>}
 */
export function asyncHandler(requestHandler) {
	return (request, response, next) => {
		try {
			const p = requestHandler(request, response, next);
			if (p instanceof Promise) {
				p.catch(next);
			}
		} catch (e) {
			// in case a sync function is passed in
			next(e);
		}
	};
}
