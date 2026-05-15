import type { RequestHandler } from 'express';
import type core from 'express-serve-static-core';

// an async handler type, since RequestHandler is sync and does not return a Promise
// adapted from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/8e274af6ed512811d15426cca3b946cd9227a255/types/express-serve-static-core/index.d.ts#L52-L65
export type AsyncRequestHandler<
	P = core.ParamsDictionary,
	ResBody = unknown,
	ReqBody = unknown,
	ReqQuery = core.Query,
	LocalsObj extends Record<string, unknown> = Record<string, unknown>
> = (
	req: core.Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
	res: core.Response<ResBody, LocalsObj>,
	next?: core.NextFunction
) => Promise<void>;

<<<<<<< HEAD
export function asyncHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj extends Record<string, unknown>>(
	// supports async or sync handlers
	requestHandler:
		| RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>
		| AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>
): RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj> {
=======
export function asyncHandler<A, B, C, D, E extends Record<string, unknown>>(
	// supports async or sync handlers
	requestHandler: RequestHandler<A, B, C, D, E> | AsyncRequestHandler<A, B, C, D, E>
): RequestHandler<A, B, C, D, E> {
>>>>>>> 65945c29 (feat(portal): add initial setup for S62A portal with environment configuration and routing)
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
