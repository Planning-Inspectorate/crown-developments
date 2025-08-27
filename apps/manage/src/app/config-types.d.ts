import { Prisma } from '@pins/crowndev-database/src/client/client.js';
import { NotifyConfig } from '@pins/crowndev-lib/govnotify/types';

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
	database: Prisma.PrismaClientOptions;
	entra: {
		// group cache ttl in minutes
		cacheTtl: number;
		groupIds: {
			caseOfficers: string;
			inspectors: string;
		};
	};
	featureFlags: {
		isRepsUploadDocsLive: boolean;
		isApplicationUpdatesLive: boolean;
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
		secret: string;
	};
	sharePoint: {
		disabled: boolean; // Enable/disable sharepoint connection
		driveId?: string; // DriveId of Crown Dev Site
		rootId?: string; // Id Root folder of Crown Dev
		caseTemplateId?: string; // Id for template folder (new case template folder structure)
	};
	staticDir: string;
}
