import 'express-session';

// Declaration merging for express-session.
// This is the approach recommended in the express-session docs for adding app-specific
// properties to req.session / SessionData.

declare module 'express-session' {
	interface SessionData {
		// Auth
		account?: import('@azure/msal-node').AccountInfo & {
			accessToken: string;
			idToken?: string;
			expiresOnTimestamp?: number;
		};
		authenticationData?: {
			nonce: string;
			postSigninRedirectUri: string;
		};

		// Authorisation
		permissions?: string[];

		// App state blobs (kept intentionally loose; narrow these as we firm up schemas)
		// TODO firm up these types
		cases?: Record<string, Record<string, unknown>>;
		representations?: Record<string, Record<string, unknown>>;
		appUpdates?: Record<string, unknown>;
		reviewDecisions?: Record<string, unknown>;
		itemsToBeDeleted?: Record<string, string[]>;
		files?: Record<string, unknown>;
		forms?: Record<string, unknown>;
		bannerMessage?: Record<string, boolean>;

		// Common error/session transient state
		errors?: unknown;
		errorSummary?: unknown;
	}
}
