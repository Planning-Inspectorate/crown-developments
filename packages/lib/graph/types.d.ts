import type { CachedEntraClient } from './cached-entra-client';

export interface GroupMember {
	id: string;
	displayName: string;
}

interface AuthSession {
	account?: {
		accessToken?: string;
	};
}

export type InitEntraClient = (session: AuthSession) => CachedEntraClient | null;
