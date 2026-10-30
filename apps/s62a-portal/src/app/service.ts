import type { Config } from './config.ts';
import { Service } from '@pins/crowndev-lib/app/base-service.ts';
import { publicAssetOptions } from '@pins/crowndev-lib/util/public-asset-options.ts';
import { initBlobStore } from '@pins/crowndev-lib/blob-store/index.ts';
import type { BlobStorageClient } from '@pins/crowndev-lib/blob-store/blob-store-client.ts';
import { type Archiver, ZipArchive, type ArchiverOptions } from 'archiver';
import { initS62aGovNotify } from '@pins/crowndev-lib/govnotify/s62a/index.ts';
import type { S62aGovNotifyClient } from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class S62APortalService extends Service {
	#config: Config;
	/** null when the blob store is disabled */
	readonly blobStore: BlobStorageClient | null;
	readonly createZipArchive: (options?: ArchiverOptions) => Archiver;
	readonly s62aNotifyClient: S62aGovNotifyClient | null;

	constructor(config: Config) {
		super(config);
		this.#config = config;
		this.blobStore = initBlobStore(config.blobStore, this.logger);
		this.createZipArchive = (options) => new ZipArchive(options);
		this.s62aNotifyClient = initS62aGovNotify(config.s62aGovNotify, this.logger);
	}

	get cacheControl() {
		return publicAssetOptions(super.cacheControl);
	}

	get contactEmail() {
		return this.#config.s62aDevContactInfo?.email;
	}

	get isLive() {
		return this.#config.featureFlags?.isLive;
	}
}
