import type { CachedEntraClient } from './cached-entra-client.js';

export interface GroupMember {
	id: string;
	displayName: string;
}

export interface AuthSession {
	account?: {
		accessToken?: string;
	};
}

export type InitEntraClient = (session: AuthSession) => CachedEntraClient | null;
