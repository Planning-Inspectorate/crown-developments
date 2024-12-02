export class MSALCacheClient {
	/**
	 * @param {ReturnType<import('redis').createClient>} redisClient
	 * */
	constructor(redisClient) {
		this.redisClient = redisClient;
	}

	/**
	 * @param {string} key
	 * @returns {Promise<string>}
	 * */
	async get(key) {
		return (await this.redisClient.get(key)) ?? '';
	}

	/**
	 * @param {string} key
	 * @param {string} value
	 * @returns {Promise<string>}
	 * */
	async set(key, value) {
		return (await this.redisClient.set(key, value)) ?? '';
	}
}
