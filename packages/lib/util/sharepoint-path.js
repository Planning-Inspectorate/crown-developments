/**
 *
 * @param {string} caseRootName
 * @param {'Applicant' | 'LPA' } [user] Requires type = Received
 * @returns {string}
 */
export function getSharePointReceivedPathForCase({ caseRootName, user }) {
	if (!user) {
		throw Error('Invalid path');
	}
	return `${caseRootName}'/Received/'${user}`;
}
