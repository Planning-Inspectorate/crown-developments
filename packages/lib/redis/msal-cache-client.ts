import type { RedisClientType } from 'redis';

export class MSALCacheClient {
	private readonly redisClient: RedisClientType;

	constructor(redisClient: RedisClientType) {
		this.redisClient = redisClient;
	}

	async get(key: string): Promise<string> {
		return (await this.redisClient.get(key)) ?? '';
	}

	async set(key: string, value: string): Promise<string> {
		return (await this.redisClient.set(key, value)) ?? '';
	}
}
