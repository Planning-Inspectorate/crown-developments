import { Router as createRouter } from 'express';
import { asyncHandler } from '@pins/crowndev-lib/util/async-handler.js';
import { buildCompleteMsalAuthentication, buildHandleSignout, buildStartMsalAuthentication } from './controller.js';
import { assertIsUnauthenticated, buildAssertGroupAccess, buildAssertIsAuthenticated } from './guards.js';
import { AuthService, clearAuthenticationData, registerAuthLocals } from './auth-service.js';

/**
 * @param {import('#service').ManageService} service
 * @param {import('./auth-service.js').AuthService} [authService] - for testing
 * @returns {{router: import('express').Router, guards: {assertIsAuthenticated: import('express').Handler, assertGroupAccess: import('express').Handler}}}
 */
export function createRoutesAndGuards(service, authService) {
	const router = createRouter();
	if (!authService) {
		authService = new AuthService({
			config: service.authConfig,
			logger: service.logger,
			redisClient: service.redisClient
		});
	}

	// setup controllers with auth service instance
	const completeMsalAuthentication = buildCompleteMsalAuthentication(service.logger, authService);
	const handleSignout = buildHandleSignout(service.logger, service.authConfig.signoutUrl, authService);
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
	const assertIsAuthenticated = buildAssertIsAuthenticated(service.logger, authService);
	// check group membership
	const assertGroupAccess = buildAssertGroupAccess(service.logger, service.authConfig.groups.applicationAccess);

	return {
		router,
		guards: {
			assertIsAuthenticated,
			assertGroupAccess
		}
	};
}
