import type { Config } from './config.ts';
import { Service } from '@pins/crowndev-lib/app/base-service.ts';
import { initBlobStore } from '@pins/crowndev-lib/blob-store/index.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import { type Archiver, ZipArchive, type ArchiverOptions } from 'archiver';

/**
 * This class encapsulates all the services and clients for the application
 */
export class S62APortalService extends Service {
	#config: Config;
	/** null when the blob store is disabled */
	readonly blobStore: BlobStorageClient | null;
	readonly createZipArchive: (options?: ArchiverOptions) => Archiver;

	constructor(config: Config) {
		super(config);
		this.#config = config;
		this.blobStore = initBlobStore(config.blobStore, this.logger);
		this.createZipArchive = (options) => new ZipArchive(options);
	}
	get contactEmail() {
		return this.#config.s62aDevContactInfo?.email;
	}

	get isLive() {
		return this.#config.featureFlags?.isLive;
	}
}
