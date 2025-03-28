import { RedisClient } from './redis-client.js';

/**
 * @param {{redis: string, redisPrefix: string}} config
 * @param {import('pino').Logger} logger
 * @returns {import('@pins/crowndev-lib/redis/redis-client').RedisClient|null}
 */
export function initRedis(config, logger) {
	if (!config.redis) {
		return null;
	}

	return new RedisClient(config.redis, logger, config.redisPrefix);
}
