import { newDatabaseClient } from '../index.js';
import { seedStaticData } from './data-static.js';
import { seedDev } from './data-dev.js';
import { loadConfig } from '../configuration/config.js';
import { seedDevLpas } from './data-lpa-dev.js';

async function run() {
	const config = loadConfig();
	const prismaConfig = {
		datasourceUrl: config.db
	};

	const dbClient = newDatabaseClient(prismaConfig);

	try {
		await seedStaticData(dbClient);
		await seedDevLpas(dbClient);
		await seedDev(dbClient);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await dbClient.$disconnect();
	}
}

run();
