import { RedisClient } from '@pins/crowndev-lib/util/redis.js';
import { loadConfig } from '../app/config.js';
import { getLogger } from './logger.js';

/**
 * Cache the redis instance
 * @type {import('@pins/crowndev-lib/util/redis').RedisClient}
 */
let redis;

/**
 * @returns {import('@pins/crowndev-lib/util/redis').RedisClient|null}
 */
export function getRedis() {
	if (redis) {
		return redis;
	}

	const config = loadConfig();

	if (!config.session.redis) {
		return null;
	}

	redis = new RedisClient(config.session.redis, getLogger(), config.session.redisPrefix);

	return redis;
}
