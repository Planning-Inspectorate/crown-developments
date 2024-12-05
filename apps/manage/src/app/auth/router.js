import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildCompleteMsalAuthentication, buildHandleSignout, buildStartMsalAuthentication } from './controller.js';
import { assertIsUnauthenticated, buildAssertGroupAccess, buildAssertIsAuthenticated } from './guards.js';
import { AuthService, clearAuthenticationData, registerAuthLocals } from './auth-service.js';

/**
 * @param {Object} opts
 * @param {import('../config-types.js').Config} opts.config
 * @param {import('pino').Logger} opts.logger
 * @param {import('@pins/crowndev-lib/redis/redis-client.js').RedisClient|null} [opts.redisClient]
 * @param {import('./auth-service.js').AuthService} [opts.authService]
 * @returns {{router: import('express').Router, guards: {assertIsAuthenticated: import('express').Handler, assertGroupAccess: import('express').Handler}}}
 */
export function createRoutesAndGuards({ config, logger, redisClient, authService }) {
	const router = createRouter();
	if (!authService) {
		authService = new AuthService({ config, logger, redisClient });
	}

	// setup controllers with auth service instance
	const completeMsalAuthentication = buildCompleteMsalAuthentication(logger, authService);
	const handleSignout = buildHandleSignout(logger, config.auth.signoutUrl, authService);
	const startMsalAuthentication = buildStartMsalAuthentication(authService);

	router.get('/redirect', assertIsUnauthenticated, asyncHandler(completeMsalAuthentication));

	// If the request continues beyond the MSAL redirectUri, then set the locals
	// derived from the auth session and clear any pending auth data. The latter
	// prevents attackers from hitting /auth/redirect in any meaningful way.
	router.use(registerAuthLocals, clearAuthenticationData);

	router.get('/signin', assertIsUnauthenticated, asyncHandler(startMsalAuthentication));
	router.get('/signout', asyncHandler(handleSignout));

	// create auth guards - to register after the auth routes with the parent router
	// check logged in
	const assertIsAuthenticated = buildAssertIsAuthenticated(logger, authService);
	// check group membership
	const assertGroupAccess = buildAssertGroupAccess(logger, config.auth.groups.applicationAccess);

	return {
		router,
		guards: {
			assertIsAuthenticated,
			assertGroupAccess
		}
	};
}
