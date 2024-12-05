import { mock } from 'node:test';

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
