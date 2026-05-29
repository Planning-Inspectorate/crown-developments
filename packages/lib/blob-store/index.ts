import type { Logger } from 'pino';
import { BlobStorageClient } from './blob-store-client.ts';
import type { BlobStoreConfig } from './types.d.ts';

/**
 * Initialises the Blob store if all the configs are set properly.
 */
export function initBlobStore(config: BlobStoreConfig, logger: Logger) {
	if (config.disabled) {
		return null;
	}

	if (!config.host) {
		return null;
	}

	if (!config.container) {
		return null;
	}

	return new BlobStorageClient(logger, config.host, config.container, config.connectionString);
}
