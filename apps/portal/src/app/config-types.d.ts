import { Prisma } from '@prisma/client';
import { NotifyConfig } from '@pins/crowndev-lib/govnotify/types';

interface Config {
	appHostname: string;
	cacheControl: {
		maxAge: string;
	};
	database: Prisma.PrismaClientOptions;
	featureFlags: {
		isLive: boolean;
		isRepsUploadDocsLive: boolean;
	};
	gitSha?: string;
	googleAnalyticsId?: string;
	httpPort: number;
	logLevel: string;
	NODE_ENV: string;
	srcDir: string;
	session: {
		redisPrefix: string;
		redis?: string;
		secret: string;
	};
	staticDir: string;
	govNotify: NotifyConfig;
	crownDevContactInfo: {
		email: string;
	};
	sharePoint: {
		disabled: boolean; // Enable/disable sharepoint connection
		driveId?: string; // DriveId of Crown Dev Site
		rootId?: string; // Id Root folder of Crown Dev
	};
}
