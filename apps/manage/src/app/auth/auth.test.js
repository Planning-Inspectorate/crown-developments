import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import express from 'express';
import { createRoutesAndGuards } from './router.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('auth', () => {
	describe('authentication', () => {
		const authService = {
			acquireTokenByCode: mock.fn(),
			acquireTokenSilent: mock.fn(),
			clearCacheForAccount: mock.fn(),
			getAuthCodeUrl: mock.fn()
		};

		const mockSession = (data) => {
			const session = { ...data };
			session.regenerate = (cb) => cb();
			session.save = (cb) => cb();
			session.destroy = mock.fn((cb) => {
				for (const k of Object.keys(session)) {
					if (['regenerate', 'save', 'destroy'].includes(k)) {
						continue;
					}
					delete session[k];
				}
				cb();
			});
			return session;
		};

		const setupApp = (sessionData = mockSession()) => {
			// basic app to test auth
			const app = express();
			const { router: authRoutes, guards: authGuards } = createRoutesAndGuards(
				{
					authConfig: {
						authority: 'https://example.com/authority',
						clientId: 'client-id',
						clientSecret: 'client-secret',
						disabled: false,
						groups: { applicationAccess: 'group-1' },
						redirectUri: '/redirect',
						signoutUrl: '/signout'
					},
					logger: mockLogger(),
					redisClient: null
				},
				authService
			);
			app.use((req, res, next) => {
				req.session = sessionData;
				next();
			});
			app.use('/unauthenticated', (req, res) => res.send('Unauthenticated'));
			app.use('/auth', authRoutes);

			// check logged in
			app.use(authGuards.assertIsAuthenticated);
			// check group membership
			app.use(authGuards.assertGroupAccess);
			app.get('/home', (req, res) => {
				res.status(200);
			});

			return supertest(app);
		};

		it('should redirect users to sign-in page', async () => {
			// this test requires session data to persist between the two calls
			const sessionData = mockSession();
			const request = setupApp(sessionData);
			const signInUrl = 'example.com/single-sign-on';
			let nonce; // save the nonce to return later
			authService.getAuthCodeUrl.mock.mockImplementationOnce((opts) => {
				nonce = opts.nonce;
				return signInUrl;
			});

			// try and access a page guarded by auth - check redirect
			const response = await request.get('/home').redirects(1);
			assert.deepStrictEqual(response.get('Location'), signInUrl);

			const code = 'msal_code';
			authService.acquireTokenByCode.mock.mockImplementationOnce(() => {
				return {
					idTokenClaims: {
						nonce
					}
				};
			});
			// access redirect page once auth'd
			const redirect = await request.get(`/auth/redirect?code=${code}`);
			assert.deepStrictEqual(redirect.get('Location'), '/home');
		});

		it('should redirect to an error page when the redirect from MSAL is incomplete', async () => {
			const request = setupApp();
			const response = await request.get('/auth/redirect').redirects(1);
			assert.match(response.redirects[0], /\/unauthenticated/);
		});

		it('should redirect to an error page when the nonce is absent from the acquired token', async () => {
			// this test requires session data to persist between the two calls
			const sessionData = mockSession();
			const request = setupApp(sessionData);

			await request.get('/').redirects(1);

			authService.acquireTokenByCode.mock.mockImplementationOnce(() => {
				return {
					idTokenClaims: {}
				};
			});

			const response = await request.get('/auth/redirect?code=msal_code').redirects(1);

			assert.match(response.redirects[0], /\/unauthenticated/);
		});

		it('should redirect to an error page when the nonce in the acquired token does not match', async () => {
			// this test requires session data to persist between the two calls
			const sessionData = mockSession();
			const request = setupApp(sessionData);

			await request.get('/').redirects(1);

			authService.acquireTokenByCode.mock.mockImplementationOnce(() => {
				return {
					idTokenClaims: {
						nonce: 'wrong'
					}
				};
			});

			const response = await request.get('/auth/redirect?code=msal_code').redirects(1);

			assert.match(response.redirects[0], /\/unauthenticated/);
		});

		it('should redirect to an error page when fetching the auth url fails', async () => {
			const request = setupApp();
			authService.getAuthCodeUrl.mock.mockImplementationOnce(() => Promise.reject(new Error('uh oh')));

			const response = await request.get(`/`).redirects(1);
			assert.match(response.text, /Error: uh oh/);
		});

		it('should redirect to an error page when acquiring the access token fails', async () => {
			const request = setupApp();
			await request.get('/auth/signin');

			authService.acquireTokenByCode.mock.mockImplementationOnce(() => Promise.reject(new Error('uh oh')));

			const response = await request.get('/auth/redirect?code=msal_code').redirects(1);
			assert.match(response.text, /Error: uh oh/);
		});

		it('should silently reacquire a token on each route navigation', async () => {
			const sessionData = mockSession({
				account: {}
			});
			const request = setupApp(sessionData);
			await request.get('/');
			assert.strictEqual(authService.acquireTokenSilent.mock.callCount(), 1);
		});

		it('should clear any pending authentication data if the MSAL redirect is not subsequently invoked', async () => {
			const sessionData = mockSession({});
			const request = setupApp(sessionData);
			// start the MSAL authentication flow
			await request.get('/auth/signin');
			// trigger an intermediary request while awaiting MSAL redirect
			await request.get('/');

			// complete MSAL redirect after authentication data has been cleared
			const response = await request.get('/auth/redirect?code=msal_code').redirects(1);
			assert.match(response.redirects[0], /\/unauthenticated/);
		});

		it('should destroy the msal token cache and session upon logging out', async () => {
			const sessionData = mockSession({ account: {} });
			const request = setupApp(sessionData);
			await request.get('/auth/signout');
			assert.strictEqual(sessionData.destroy.mock.callCount(), 1);

			// access an authenticated route to determine if we're signed out
			const response = await request.get('/home').redirects(1);
			assert.match(response.redirects[0], /\/auth\/signin/);
		});
	});
});
