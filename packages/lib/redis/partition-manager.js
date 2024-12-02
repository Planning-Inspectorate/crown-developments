export class PartitionManager {
	/**
	 * @param {import('@azure/msal-node').ICacheClient} redisClient
	 * @param {string} sessionId
	 * @param {import('pino').BaseLogger} logger
	 * @param {string} [keyPrefix]
	 * */
	constructor(redisClient, sessionId, logger, keyPrefix = 'sess:') {
		this.redisClient = redisClient;
		this.sessionId = sessionId;
		this.logger = logger;
		this.keyPrefix = keyPrefix;
	}

	/**
	 * @returns {Promise<string>}
	 * */
	async getKey() {
		try {
			const sessionData = await this.redisClient.get(`${this.keyPrefix}${this.sessionId}`);
			const session = JSON.parse(sessionData);
			return session.account?.homeAccountId || '';
		} catch (/** @type {*} */ err) {
			this.logger.error(err.msg);
			return '';
		}
	}

	/**
	 * @param {import('@azure/msal-common').AccountEntity} accountEntity
	 * @returns {Promise<string>}
	 * */
	async extractKey(accountEntity) {
		if (!accountEntity.homeAccountId) {
			throw new Error('homeAccountId not found');
		}

		return accountEntity.homeAccountId;
	}
}
