export class UrlBuilder {
	/**
	 * @param {string} baseUrl
	 */
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
		/**
		 * @type {any[]}
		 */
		this.pathSegments = [];
		this.queryParams = new URLSearchParams();
	}

	/**
	 * @param {string} segment
	 * @returns {UrlBuilder}
	 */
	addPathSegment(segment) {
		this.pathSegments.push(segment);
		return this;
	}

	/**
	 * @param {string} key
	 * @param {string} value
	 * @returns {UrlBuilder}
	 */
	addQueryParam(key, value) {
		this.queryParams.append(key, value);
		return this;
	}

	/**
	 *
	 * @param {string[][] | undefined} queries Array of key value pairs (e.g. [[key, value], [key2, value2]])
	 * @returns {UrlBuilder}
	 */
	addQueryParams(queries = []) {
		for (const query of queries) {
			this.queryParams.append(query[0], query[1]);
		}
		return this;
	}
	/**
	 *
	 * @returns {string} url
	 */
	toString() {
		const path = this.pathSegments.join('/');
		const queryString = this.queryParams.toString();
		return `${this.baseUrl}/${path}${queryString ? '?' + queryString : ''}`;
	}
}
