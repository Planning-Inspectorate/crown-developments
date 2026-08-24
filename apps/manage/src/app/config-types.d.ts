import type { NotifyConfig } from '@pins/crowndev-lib/govnotify/gov-notify-client';

interface Config {
	appName: string;
	appHostname: string;
	auth: {
		authority: string;
		clientId: string;
		clientSecret: string;
		disabled: boolean;
		groups: {
			// group ID for accessing the application
			applicationAccess: string;
		};
		redirectUri: string;
		signoutUrl: string;
	};
	azureLanguage: {
		categories: string; // CSV string
		endpoint: string;
	};
	cacheControl: {
		maxAge: string;
	};
	database: {
		connectionString: string;
	};
	entra: {
		// group cache ttl in minutes
		cacheTtl: number;
		groupIds: {
			caseOfficers: string;
			inspectors: string;
		};
	};
	blobStore: {
		disabled: boolean;
		host: string;
		container: string;
		connectionString: string;
	};
	featureFlags: {
		isS62ALive: boolean;
		isCaseNotesLive: boolean;
		isAuditLive: boolean;
	};
	gitSha?: string;
	govNotify: NotifyConfig;
	httpPort: number;
	logLevel: string;
	NODE_ENV: string;
	portalBaseUrl: string;
	srcDir: string;
	session: {
		redisPrefix: string;
		redis?: string;
		secret: string[]; // Express session can take an array, it assigns the first value but allows any in the array
	};
	sharePoint: {
		disabled: boolean; // Enable/disable sharepoint connection
		driveId?: string; // DriveId of Crown Dev Site
		rootId?: string; // Id Root folder of Crown Dev
		caseTemplateId?: string; // Id for template folder (new case template folder structure)
	};
	staticDir: string;
}
