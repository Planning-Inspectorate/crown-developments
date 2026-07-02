import type { BaseConfig } from '@pins/crowndev-lib/app/config-types.d.ts';
import type { NotifyConfig } from '@pins/crowndev-lib/govnotify/types';

export interface Config extends BaseConfig {
	appName?: string;
	appHostname?: string;
	cacheControl: {
		maxAge: string;
	};
	dynamicCacheControl?: {
		enabled: boolean;
		maxAge: string;
	};
	database: {
		connectionString: string | undefined;
	};
	featureFlags: {
		isLive: boolean;
		//isRepsUploadDocsLive: boolean;
		//isApplicationUpdatesLive: boolean;
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
	govNotify?: NotifyConfig;
	s62aDevContactInfo: {
		email: string | undefined;
	};
}
