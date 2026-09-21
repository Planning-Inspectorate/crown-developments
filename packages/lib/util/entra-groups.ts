import type { GroupMember, AuthSession, InitEntraClient } from '@pins/crowndev-lib/graph/types.js';
import type { BaseLogger } from 'pino';

export interface RequiredEntraGroupIds {
	caseOfficers: string;
	inspectors: string;
	s62aInspectors: string;
	s62aReaders: string;
	s62aPlanningOfficers: string;
}

export type EntraGroupIds = RequiredEntraGroupIds & Record<string, string>;

export type EntraGroupMembers = Record<string, GroupMember[]>;

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
		inspectors: [],
		s62aInspectors: [],
		s62aReaders: [],
		s62aAssessors: [],
		s62aPlanningOfficers: []
	};
	const client = initClient(session);
	if (!client) {
		logger.warn('skipping entra group members, no Entra client');
		return members;
	}
	const [caseOfficers, inspectors, s62aInspectors, readers, planningOfficers] = await Promise.all([
		client.listAllGroupMembers(groupIds.caseOfficers),
		client.listAllGroupMembers(groupIds.inspectors),
		client.listAllGroupMembers(groupIds.s62aInspectors),
		client.listAllGroupMembers(groupIds.s62aReaders),
		client.listAllGroupMembers(groupIds.s62aPlanningOfficers)
	]);
	members.caseOfficers = caseOfficers;
	members.inspectors = inspectors;
	members.s62aInspectors = s62aInspectors;
	members.s62aReaders = readers;
	members.s62aPlanningOfficers = planningOfficers;
	members.s62aAssessors = [...new Map([...s62aInspectors, ...readers].map((member) => [member.id, member])).values()];
	const totalMembers = new Set(
		Object.values(members)
			.flat()
			.map((member) => member.id)
	).size;
	logger.info({ totalMembers }, 'got group members');

	return members;
}
