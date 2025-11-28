import { newDatabaseClient } from '../index.js';
import { seedStaticData } from './data-static.js';
import { loadConfig } from '../configuration/config.js';
import { seedProdLpas } from './data-lpa-prod.js';

async function run() {
	const config = loadConfig();
	const dbClient = newDatabaseClient(config.db);

	try {
		await seedStaticData(dbClient);
		await seedProdLpas(dbClient);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await dbClient.$disconnect();
	}
}

run();
