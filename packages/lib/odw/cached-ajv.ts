import { Ajv } from 'ajv';
import { loadAllSchemas } from '@planning-inspectorate/data-model';

let ajvInit: Promise<Ajv> | null = null;
let cachedAjv: Ajv | null = null;

/* Cache Ajv instance to avoid re-initialising on every function invocation */
export async function getCachedAjv() {
	if (cachedAjv) return cachedAjv;
	if (!ajvInit) {
		ajvInit = (async () => {
			try {
				const schemas = await loadAllSchemas();
				return new Ajv({ allErrors: true, strict: false, schemas });
			} catch (error) {
				ajvInit = null;
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Failed to initialise AJV instance. Error: ${message}`, { cause: error });
			}
		})();
	}
	cachedAjv = await ajvInit;
	return cachedAjv;
}
