import { Prisma } from '@prisma/client';

interface Config {
	database: Prisma.PrismaClientOptions;
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
	govNotifyApiKey: string;
}
