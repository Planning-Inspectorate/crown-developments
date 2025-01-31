import { Prisma } from '@prisma/client';

interface Config {
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
	database: Prisma.PrismaClientOptions;
	entra: {
		// group cache ttl in minutes
		cacheTtl: number;
		groupIds: {
			caseOfficers: string;
			inspectors: string;
		};
	};
	gitSha?: string;
	logLevel: string;
	NODE_ENV: string;
	httpPort: number;
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
	govNotify: {
		disabled: boolean;
		apiKey: string;
		testTemplate: string;
	};
}
