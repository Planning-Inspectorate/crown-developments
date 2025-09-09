import { describe, it } from 'node:test';
import assert from 'node:assert';
import { clearAppUpdatesFromSession, getApplicationUpdateSessionData, validateParams } from './utils.js';

describe('utils.js', () => {
	describe('validateParams', () => {
		it('should successfully validate params if id and updateId are present', async () => {
			assert.deepStrictEqual(validateParams({ id: 'id-01', updateId: 'app-update-01' }), {
				id: 'id-01',
				applicationUpdateId: 'app-update-01'
			});
		});
		it('should return error if id param not present', async () => {
			assert.throws(() => validateParams({}), { message: 'id param required' });
		});
		it('should return error if updateId param not present', async () => {
			assert.throws(() => validateParams({ id: 'id-01' }), { message: 'application update id param required' });
		});
	});
	describe('getApplicationUpdateSessionData', () => {
		it('should return app updates for provided applicationUpdateId', async () => {
			const mockReq = {
				session: {
					appUpdates: {
						appUpdate1: {
							details: 'an update',
							publishNow: 'no'
						}
					}
				}
			};
			assert.deepStrictEqual(getApplicationUpdateSessionData(mockReq, 'appUpdate1'), {
				details: 'an update',
				publishNow: 'no'
			});
		});
		it('should return empty object if applicationUpdateId not provided', async () => {
			const mockReq = {
				session: {
					appUpdates: {
						appUpdate1: {
							details: 'an update',
							publishNow: 'no'
						}
					}
				}
			};
			assert.deepStrictEqual(getApplicationUpdateSessionData(mockReq), {});
		});
		it('should return empty object if no app update exists for provided applicationUpdateId', async () => {
			const mockReq = {
				session: {
					appUpdates: {
						appUpdate1: {
							details: 'an update',
							publishNow: 'no'
						}
					}
				}
			};
			assert.deepStrictEqual(getApplicationUpdateSessionData(mockReq, 'appUpdate2'), {});
		});
	});
	describe('clearAppUpdatesFromSession', () => {
		it('should clear associated app update session data for provided applicationUpdateId', async () => {
			const mockReq = {
				session: {
					appUpdates: {
						appUpdate1: {
							details: 'an update',
							publishNow: 'yes'
						},
						appUpdate2: {
							details: 'further updates to project',
							publishNow: 'no'
						},
						appUpdate3: {
							details: 'a draft update',
							publishNow: 'no'
						}
					}
				}
			};
			clearAppUpdatesFromSession(mockReq, 'appUpdate2');
			assert.deepStrictEqual(mockReq, {
				session: {
					appUpdates: {
						appUpdate1: {
							details: 'an update',
							publishNow: 'yes'
						},
						appUpdate3: {
							details: 'a draft update',
							publishNow: 'no'
						}
					}
				}
			});
		});
		it('should set appUpdates in session to empty if no applicationUpdateId provided', async () => {
			const mockReq = {
				session: {
					appUpdates: {
						appUpdate1: {
							details: 'an update',
							publishNow: 'yes'
						}
					}
				}
			};
			clearAppUpdatesFromSession(mockReq, 'appUpdate1');
			assert.deepStrictEqual(mockReq, {
				session: {
					appUpdates: {}
				}
			});
		});
		it('should return without making any updates if session is not present in req', async () => {
			const mockReq = {};
			clearAppUpdatesFromSession(mockReq, 'appUpdate1');
			assert.deepStrictEqual(mockReq, {});
		});
	});
});
