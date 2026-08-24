import { mock, type Mock } from 'node:test';
import type { Logger } from 'pino';

type MockFn = Mock<(...args: unknown[]) => void>;

/** * A mock logger type that satisfies Logger but exposes the mock functions. * This allows consuming code to access the `.mock` property for assertions. */
export type MockLogger = Logger & {
	silent: MockFn;
	trace: MockFn;
	info: MockFn;
	debug: MockFn;
	warn: MockFn;
	error: MockFn;
	fatal: MockFn;
};

export function mockLogger(): MockLogger {
	return {
		level: 'debug',
		msgPrefix: '',
		silent: mock.fn(),
		trace: mock.fn(),
		info: mock.fn(),
		debug: mock.fn(),
		warn: mock.fn(),
		error: mock.fn(),
		fatal: mock.fn()
	} as MockLogger;
}
