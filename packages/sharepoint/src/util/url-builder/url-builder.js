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
	 */
	addPathSegment(segment) {
		this.pathSegments.push(segment);
		return this;
	}

	/**
	 * @param {string} key
	 * @param {string} value
	 */
	addQueryParam(key, value) {
		this.queryParams.append(key, value);
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
