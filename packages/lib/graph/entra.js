import { URL } from 'node:url';

const PER_PAGE = 500; // max 999 per page
const MAX_PAGES = 10; // max 5000 entries

// odata reference properties and values
export const ODATA = Object.freeze({
	NEXT_LINK: '@odata.nextLink',
	TYPE: '@odata.type',
	GROUP_TYPE: '#microsoft.graph.group',
	USER_TYPE: '#microsoft.graph.user'
});

export class EntraClient {
	/** @type {import('@microsoft/microsoft-graph-client').Client} */
	#client;

	/**
	 * @param {import('@microsoft/microsoft-graph-client').Client} client
	 */
	constructor(client) {
		this.#client = client;
	}

	/**
	 * Fetch all group members - direct and indirect - of an Entra group, up to a maximum of 5000
	 *
	 * @param {string} groupId
	 * @returns {Promise<import('./types.js').GroupMember[]>}
	 */
	async listAllGroupMembers(groupId) {
		const listMembers = this.#client
			.api(`groups/${groupId}/transitiveMembers`)
			.select(['id', 'displayName'])
			.top(PER_PAGE);

		const members = [];
		for (let i = 0; i < MAX_PAGES; i++) {
			const res = await listMembers.get();
			members.push(...res.value.filter((v) => v[ODATA.TYPE] === ODATA.USER_TYPE));

			const nextLink = res[ODATA.NEXT_LINK];
			if (!nextLink) {
				break;
			}
			// make the next request with the skipToken value to fetch the next page
			const token = EntraClient.extractSkipToken(nextLink);
			listMembers.skipToken(token);
		}
		return members;
	}

	async checkUserExistsByEmail(email) {
		const sanitizedEmail = email.replace(/'/g, "''");
		const existingUser = await this.#client
			.api('/users')
			.filter(`mail eq '${sanitizedEmail}'`)
			.select(['id', 'mail'])
			.get();
		return existingUser.value.length > 0;
	}

	/**
	 * Checks and adds a user as a guest B2B Entra user
	 * @param {string[]} emails - The email addresses to invite
	 * @param {string} redirectUrl - where to redirect the user on authentication
	 * @param {Object} opts - Optional parameters
	 * @param {boolean} opts.sendInvitation - Optional: send an email invitation (defaults to false)
	 * @param {boolean} opts.resetRedemption - Optional: requires the user to reauthenticate (defaults to false)
	 * @returns {Promise<{email: string, inviteRedeemUrl: string | null}[]>} The email of the guest user and the redeemUrl if a user was created
	 */
	async addUsersAsGuests(emails, redirectUrl, { sendInvitation = false, resetRedemption = false } = {}) {
		const results = [];
		for (const email of emails) {
			// Check if user already exists as guest
			const existingUser = await this.checkUserExistsByEmail(email);

			if (existingUser) {
				results.push({ email, inviteRedeemUrl: null });
				continue;
			}

			// Invite as B2B guest
			const invitationResponse = await this.#client.api('/invitations').post({
				invitedUserEmailAddress: email,
				inviteRedirectUrl: redirectUrl,
				sendInvitation,
				resetRedemption
			});

			results.push({
				email: invitationResponse.invitedUserEmailAddress,
				inviteRedeemUrl: invitationResponse.inviteRedeemUrl
			});
		}

		return results;
	}

	/**
	 * Get a skip token out of an '@odata.nextLink' value
	 *
	 * @param {string} link
	 * @returns {string|undefined}
	 */
	static extractSkipToken(link) {
		const url = URL.parse(link);
		if (!url) {
			return undefined;
		}
		for (const [k, v] of url.searchParams) {
			if (k.toLowerCase() === '$skiptoken') {
				return v;
			}
		}
	}
}
