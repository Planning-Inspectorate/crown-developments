import type { CrownNotifyConfig } from '@pins/crowndev-lib/govnotify/crown/crown-gov-notify-client.ts';
import type { S62aNotifyConfig } from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
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
		isS62APortalLive: boolean;
		isCaseNotesLive: boolean;
		isAuditLive: boolean;
		isRetryLive: boolean;
		isS62aNotifyCallBackEnabled: boolean;
	};
	govNotify: CrownNotifyConfig;
	s62aGovNotify: S62aNotifyConfig;
	portalBaseUrl: string;
	sharePoint: {
		disabled: boolean; // Enable/disable sharepoint connection
		driveId?: string; // DriveId of Crown Dev Site
		rootId?: string; // Id Root folder of Crown Dev
		caseTemplateId?: string; // Id for template folder (new case template folder structure)
	};
}
