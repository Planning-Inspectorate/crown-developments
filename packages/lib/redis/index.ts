import { RedisClient } from './redis-client.ts';
import type { Logger } from 'pino';

interface RedisConfig {
	redis?: string;
	redisPrefix: string;
}

export function initRedis(config: RedisConfig, logger: Logger): RedisClient | null {
	if (!config.redis) {
		return null;
	}

	return new RedisClient(config.redis, logger, config.redisPrefix);
}
