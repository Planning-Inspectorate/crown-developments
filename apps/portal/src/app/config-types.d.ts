import { Prisma } from '@prisma/client';

interface Config {
	database: Prisma.PrismaClientOptions;
	featureFlags: {
		isLive: boolean;
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
	staticDir: string;
	govNotify: {
		disabled: boolean;
		apiKey: string;
		templates: {
			test: string;
		};
	};
	crownDevContactInfo: {
		email: string;
	};
	sharePoint: {
		disabled: boolean; // Enable/disable sharepoint connection
		driveId?: string; // DriveId of Crown Dev Site
		rootId?: string; // Id Root folder of Crown Dev
	};
}
