import { mock } from 'node:test';
import { createRequire } from 'node:module';
import nunjucks from 'nunjucks';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @returns {import('pino').BaseLogger}
 */
export function mockLogger() {
	return {
		level: 'debug',
		silent: mock.fn(),
		trace: mock.fn(),
		info: mock.fn(),
		debug: mock.fn(),
		warn: mock.fn(),
		error: mock.fn(),
		fatal: mock.fn()
	};
}

export const mockReq = () => ({
	log: mockLogger(),
	params: {},
	body: {}
});

export const mockRes = () => {
	const res = {
		locals: {},
		redirect: mock.fn(),
		status: mock.fn(),
		render: mock.fn(),
		send: mock.fn()
	};
	res.status.mock.mockImplementation(() => res);
	res.send.mock.mockImplementation(() => res);

	return res;
};

export function configureNunjucks() {
	const require = createRequire(import.meta.url);
	const paths = [
		// get the path to the govuk-frontend folder, in node_modules, using the node require resolution
		path.resolve(require.resolve('govuk-frontend'), '../..'),
		// path to src folder
		path.join(__dirname, '..')
	];
	return nunjucks.configure(paths);
}
