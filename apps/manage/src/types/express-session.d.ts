import 'express-session';

type CaseId = string;

// Keep the supported questionUrl values in sync with `questionConfig` in delete.js.
type BannerMessageQuestionUrl = keyof typeof import('../app/views/cases/view/delete.js').questionConfig;

type BannerMessageKey = `${BannerMessageQuestionUrl}:item-removed-success`;

// Declaration merging for express-session.
// This is the approach recommended in the express-session docs for adding app-specific
// properties to req.session / SessionData.

declare module 'express-session' {
	interface FormSessionData {
		[key: string]: unknown;
	}

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
		// TODO firm up these types CROWN-1576
		cases?: Record<CaseId, Record<string, unknown>>;
		representations?: Record<string, Record<string, unknown>>;
		appUpdates?: Record<string, unknown>;
		reviewDecisions?: Record<string, unknown>;
		itemsToBeDeleted?: Record<string, string[]>;
		files?: Record<string, unknown>;
		forms?: Record<string, FormSessionData>;
		bannerMessage?: Record<CaseId, Record<BannerMessageKey, boolean>>;

		// Common error/session transient state
		errors?: unknown;
		errorSummary?: unknown;
	}
}
