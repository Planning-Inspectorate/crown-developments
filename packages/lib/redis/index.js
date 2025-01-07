import { RedisClient } from './redis-client.js';

/**
 * Cache the redis instance
 * @type {import('@pins/crowndev-lib/redis/redis-client').RedisClient}
 */
let redis;

/**
 * @param {{redis: string, redisPrefix: string}} config
 * @param {import('pino').Logger} logger
 * @returns {import('@pins/crowndev-lib/redis/redis-client').RedisClient|null}
 */
export function getRedis(config, logger) {
	if (redis) {
		return redis;
	}

	if (!config.redis) {
		return null;
	}

	redis = new RedisClient(config.redis, logger, config.redisPrefix);

	return redis;
}
