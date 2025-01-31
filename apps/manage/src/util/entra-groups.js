/**
 * @param {Object} options
 * @param {import('pino').BaseLogger} options.logger
 * @param {(session) => CachedEntraClient | null} options.initClient
 * @param {*} options.session
 * @param {typeof import('../app/config-types.js').Config.entra.groupIds} options.groupIds
 * @returns {import('./entra-groups-types.js').EntraGroupMembers}
 */
export async function getEntraGroupMembers({ logger, initClient, session, groupIds }) {
	const members = {
		caseOfficers: [],
		inspectors: []
	};
	const client = initClient(session);
	if (!client) {
		logger.warn('skipping entra group members, no Entra client');
		return members;
	}
	const [caseOfficers, inspectors] = await Promise.all([
		client.listAllGroupMembers(groupIds.caseOfficers),
		client.listAllGroupMembers(groupIds.inspectors)
	]);
	members.caseOfficers = caseOfficers;
	members.inspectors = inspectors;
	logger.info({ caseOfficersCount: caseOfficers.length, inspectorsCount: inspectors.length }, 'got group members');

	return members;
}
