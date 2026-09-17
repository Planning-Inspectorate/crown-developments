import type { NotifyConfig } from '@pins/crowndev-lib/govnotify/types';
import type { BaseConfig } from '@planning-inspectorate/core/app';

interface Config extends BaseConfig {
	appName: string;
	appHostname: string;
	staticCacheControl: {
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
