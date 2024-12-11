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
