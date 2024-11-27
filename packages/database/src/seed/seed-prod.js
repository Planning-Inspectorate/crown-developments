import { newDatabaseClient } from '../index.js';
import { seedStaticData } from './data-static.js';
import { loadConfig } from '../configuration/config.js';

async function run() {
	const config = loadConfig();
	const prismaConfig = {
		datasourceUrl: config.db
	};

	const dbClient = newDatabaseClient(prismaConfig);

	try {
		await seedStaticData(dbClient);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await dbClient.$disconnect();
	}
}

run();
