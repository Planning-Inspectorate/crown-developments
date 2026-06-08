import type { NotifyConfig } from '@pins/crowndev-lib/govnotify/types';

interface Config {
	appName: string;
	appHostname: string;
	staticCacheControl: {
		maxAge: string;
	};
	dynamicCacheControl: {
		enabled: boolean;
		maxAge: string;
	};
	database: {
		connectionString: string;
	};
	featureFlags: {
		isLive: boolean;
		isRepsUploadDocsLive: boolean;
		isApplicationUpdatesLive: boolean;
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
	s62aDevContactInfo: {
		email: string;
	};
}
