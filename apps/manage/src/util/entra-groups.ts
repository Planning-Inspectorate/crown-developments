import type { GroupMember, AuthSession, InitEntraClient } from '@pins/crowndev-lib/graph/types.js';
import type { BaseLogger } from 'pino';

type EntraGroupIds = {
	caseOfficers: string;
	inspectors: string;
};

export interface EntraGroupMembers {
	caseOfficers: GroupMember[];
	inspectors: GroupMember[];
}

/**
 * Get the members of the Entra groups, using the provided client initializer and group IDs.
 * If no client can be initialized, returns empty arrays.
 */
export async function getEntraGroupMembers({
	logger,
	initClient,
	session,
	groupIds
}: {
	logger: BaseLogger;
	initClient: InitEntraClient;
	session: AuthSession;
	groupIds: EntraGroupIds;
}): Promise<EntraGroupMembers> {
	const members: EntraGroupMembers = {
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
