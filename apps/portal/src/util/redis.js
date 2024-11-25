import { RedisClient } from '@pins/crowndev-lib/util/redis';
import { loadConfig } from '../app/config';
import { getLogger } from './logger';

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

    redis = new RedisClient(config.session.redis, getLogger());

    return redis;
}