import type { NotifyConfig } from '@pins/crowndev-lib/govnotify/types';
import type { BaseConfig } from '@planning-inspectorate/core/app';

interface Config extends BaseConfig {
	appName: string;
	appHostname: string;
	cacheControl: {
		maxAge: string;
	};
	dynamicCacheControl: {
		enabled: boolean;
		maxAge: string;
	};
	featureFlags: {
		isLive: boolean;
		isRetryLive: boolean;
	};
	googleAnalyticsId?: string;
	microsoftClarityId?: string;
	govNotify: NotifyConfig;
	crownDevContactInfo: {
		email: string;
	};
	sharePoint: {
		disabled: boolean; // Enable/disable sharepoint connection
		driveId: string; // DriveId of Crown Dev Site
		rootId?: string; // Id Root folder of Crown Dev
	};
}
