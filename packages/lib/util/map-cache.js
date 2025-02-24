/**
 * @typedef {Object} CacheEntry
 * @property {Date} updated
 * @property {*} value
 */

export class MapCache {
	/** @type {Map<string, CacheEntry>} */
	cache = new Map();
	/** @type {number} */
	#ttl;

	/**
	 * @param {number} ttlMinutes
	 */
	constructor(ttlMinutes) {
		this.#ttl = ttlMinutes * 60 * 1000; // to ms
	}

	/**
	 * @param {string} id
	 * @returns {undefined|*}
	 */
	get(id) {
		const entry = this.cache.get(id);
		if (!entry) {
			return undefined;
		}
		if (new Date() - entry.updated > this.#ttl) {
			this.cache.delete(id);
			return undefined;
		}
		return entry.value;
	}

	/**
	 * @param {string} id
	 * @param {*} value
	 */
	set(id, value) {
		this.cache.set(id, { updated: new Date(), value });
	}
}
