import { Prisma } from '@prisma/client';

interface Config {
	database: Prisma.PrismaClientOptions;
	gitSha?: string;
	logLevel: string;
	NODE_ENV: string;
	httpPort: number;
	srcDir: string;
	session: {
		redis: string;
		secret: string;
	};
	staticDir: string;
}
