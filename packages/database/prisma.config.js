import { defineConfig } from 'prisma/config';
import path from 'node:path';
import dotenv from 'dotenv';

// load configuration from .env file into process.env
dotenv.config();

export default defineConfig({
	schema: path.join('src', 'schema.prisma'),
	migrations: {
		path: path.join('src', 'migrations'),
		seed: 'node src/seed/seed-dev.js'
	},
	datasource: {
		url: process.env.SQL_CONNECTION_STRING_ADMIN || ''
	}
});
