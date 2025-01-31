/**
 * @typedef {Object} CacheEntry
 * @property {Date} updated
 * @property {*} value
 */

const newDate = () => new Date();

export class MapCache {
	/** @type {Map<string, CacheEntry>} */
	cache = new Map();
	/** @type {number} */
	#ttl;
	/** @type {() => Date} */
	#getNow;

	/**
	 * @param {number} ttlMinutes
	 * @param {() => Date} [getNow]
	 */
	constructor(ttlMinutes, getNow = newDate) {
		this.#ttl = ttlMinutes * 60 * 1000; // to ms
		this.#getNow = getNow;
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
		if (this.#getNow() - entry.updated > this.#ttl) {
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
		this.cache.set(id, { updated: this.#getNow(), value });
	}
}
