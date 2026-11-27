import { Ajv } from 'ajv';
import { loadAllSchemas } from '@planning-inspectorate/data-model';
import addFormats from 'ajv-formats';

let ajvInit: Promise<Ajv> | null = null;
let cachedAjv: Ajv | null;

/* Cache Ajv instance to avoid re-initialising on every function invocation */
export async function getCachedAjv() {
	if (cachedAjv) return cachedAjv;
	if (!ajvInit) {
		ajvInit = (async () => {
			try {
				const schemas = await loadAllSchemas();
				const ajv = new Ajv({
					allErrors: true,
					strict: false,
					schemas
				});
				addFormats.default(ajv);

				return ajv;
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
