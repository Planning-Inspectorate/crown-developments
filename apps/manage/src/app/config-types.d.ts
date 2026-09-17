import type { NotifyConfig } from '@pins/crowndev-lib/govnotify/gov-notify-client';
import type { BaseConfig } from '@planning-inspectorate/core/app';

interface Config extends BaseConfig {
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
		tokenScopes: string;
	};
	azureLanguage: {
		categories: string; // CSV string
		endpoint: string;
	};
	entra: {
		// group cache ttl in minutes
		cacheTtl: number;
		groupIds: {
			caseOfficers: string;
			inspectors: string;
			s62aInspectors: string;
			s62aReaders: string;
			s62aPlanningOfficers: string;
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
		isRetryLive: boolean;
	};
	govNotify: NotifyConfig;
	portalBaseUrl: string;
	sharePoint: {
		disabled: boolean; // Enable/disable sharepoint connection
		driveId?: string; // DriveId of Crown Dev Site
		rootId?: string; // Id Root folder of Crown Dev
		caseTemplateId?: string; // Id for template folder (new case template folder structure)
	};
}
