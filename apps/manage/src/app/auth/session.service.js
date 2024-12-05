/** @typedef {import('express-session').Session & AuthState} SessionWithAuth */
/** @typedef {import('@azure/msal-node').AccountInfo} AccountInfo */
/** @typedef {import('@azure/msal-node').AuthenticationResult} AuthenticationResult */

/**
 * @typedef {object} AuthenticationData
 * @property {string} nonce
 * @property {string} postSigninRedirectUri
 */

/**
 * @typedef {object} AuthState
 * @property {AccountInfo & {accessToken: string, expiresOnTimestamp?: number}} [account]
 * @property {AuthenticationData=} authenticationData
 */

/**
 * @param {SessionWithAuth} session
 * @returns {void}
 */
export const destroyAuthenticationData = (session) => {
	delete session?.authenticationData;
};

/**
 * @param {SessionWithAuth} session
 * @returns {AuthenticationData}
 */
export const getAuthenticationData = (session) => {
	if (session?.authenticationData) {
		return session?.authenticationData;
	}
	throw new Error('Authentication does not exist.');
};

/**
 * @param {SessionWithAuth} session
 * @param {AuthenticationData} data
 * @returns {void}
 */
export const setAuthenticationData = (session, data) => {
	session.authenticationData = data;
};

/**
 * @param {SessionWithAuth} session
 * @returns {void}
 */
export const destroyAccount = (session) => {
	delete session?.account;
};

/**
 * @param {SessionWithAuth} session
 * @param {AuthenticationResult} authenticationResult
 * @returns {void}
 */
export const setAccount = (session, authenticationResult) => {
	const { account, accessToken, idToken, expiresOn } = authenticationResult;

	if (!account) {
		return;
	}
	session.account = {
		...account,
		accessToken,
		idToken,
		expiresOnTimestamp: expiresOn?.getTime()
	};
};

/**
 * @param {SessionWithAuth} session
 * @returns {AccountInfo=}
 */
export const getAccount = (session) => {
	return session?.account;
};
