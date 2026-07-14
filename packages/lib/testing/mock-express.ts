import type { Request, Response } from 'express';

/**
 * Test helpers for working with Express `Request`/`Response` mocks without
 * scattering `as any` / `as unknown as` casts through the suites.
 *
 * Tests only ever build partial mocks (a `params` bag, a `render` spy, ...),
 * so a single narrowing cast per object is both unavoidable and safe: the
 * assertions immediately verify the behaviour that relies on the shape.
 */

/** Cast a partial mock object to an Express `Request`. */
export const asReq = (obj: object = {}): Request => obj as unknown as Request;

/** Cast a partial mock object to an Express `Response`. */
export const asRes = (obj: object = {}): Response => obj as unknown as Response;
