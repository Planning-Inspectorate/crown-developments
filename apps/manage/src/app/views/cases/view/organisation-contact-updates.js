import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { optionalWhere } from '@pins/crowndev-lib/util/database.js';
import { viewModelToAddressUpdateInput, isAddress, isSameAddress } from '@pins/crowndev-lib/util/address.js';
import { extractApplicantContactFields, extractAgentContactFields } from '../util/contact.js';
import { isDefined } from '@pins/crowndev-lib/util/boolean.js';

/**
 * @template T
 * @typedef {import('@prisma/client/runtime/client').PrismaPromise<T>} PrismaPromise
 */

/**
 * @typedef {{
 *  scalarCaseUpdates: { caseIds: string[], updateInput: import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput },
 *  shared: {
 *   organisationCreates: Array<{ placeholderId: string, data: import('@pins/crowndev-database').Prisma.OrganisationCreateInput }>,
 *   organisationUpdates: Array<{ organisationId: string, data: import('@pins/crowndev-database').Prisma.OrganisationUpdateInput }>,
 *   linkCreates: Array<{ caseId: string, organisationId: string, roleId: string }>,
 *   contactUpdates: Array<{ contactId: string, data: import('@pins/crowndev-database').Prisma.ContactUpdateInput }>,
 *   newOrganisationContacts: Array<{ organisationId: string, data: import('@pins/crowndev-database').Prisma.ContactCreateInput }>,
 *   organisationToContactDeletes: Array<{ id: string }>,
 *   organisationToContactCreates: Array<{ organisationId: string, contactId: string }>
 *  }
 * }} CaseUpdateWritePlan
 */

const ORG_PLACEHOLDER_PREFIX = '__new_org__:';

/**
 * Whether the save payload contains any fields that require organisation/contact writes.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 */
export function hasOrganisationWriteEdits(toSave) {
	return (
		Object.hasOwn(toSave, 'manageApplicantDetails') ||
		Object.hasOwn(toSave, 'manageApplicantContactDetails') ||
		Object.hasOwn(toSave, 'manageAgentContactDetails') ||
		Object.hasOwn(toSave, 'agentOrganisationName') ||
		Object.hasOwn(toSave, 'agentOrganisationAddress')
	);
}

/**
 * Build an explicit write plan for organisation/contact edits.
 *
 * @param {{
 *  toSave: import('./types.js').CrownDevelopmentViewModel,
 *  dbViewModel: import('./types.js').CrownDevelopmentViewModel,
 *  caseIds: string[],
 *  scalarUpdateInput: import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput,
 *  crownDevelopments: any[]
 * }} args
 * @returns {CaseUpdateWritePlan}
 */
export function buildCaseUpdateWritePlan({ toSave, dbViewModel, caseIds, scalarUpdateInput, crownDevelopments }) {
	/** @type {CaseUpdateWritePlan} */
	const plan = {
		scalarCaseUpdates: { caseIds, updateInput: scalarUpdateInput },
		shared: {
			organisationCreates: [],
			organisationUpdates: [],
			linkCreates: [],
			contactUpdates: [],
			newOrganisationContacts: [],
			organisationToContactDeletes: [],
			organisationToContactCreates: []
		}
	};

	const existingLinks = new Set();
	/** @type {Map<string, any>} */
	const organisationById = new Map();

	for (const cd of crownDevelopments) {
		for (const rel of cd?.Organisations || []) {
			existingLinks.add(`${cd.id}:${rel.role}:${rel.organisationId}`);
			if (rel?.Organisation?.id) {
				organisationById.set(rel.Organisation.id, rel.Organisation);
			}
		}
	}

	/**
	 * @param {string} caseId
	 * @param {string} roleId
	 * @param {string} organisationId
	 */
	const ensureLink = (caseId, roleId, organisationId) => {
		const key = `${caseId}:${roleId}:${organisationId}`;
		if (existingLinks.has(key)) return;
		existingLinks.add(key);
		plan.shared.linkCreates.push({ caseId, roleId, organisationId });
	};

	/** Applicant orgs: create once, update by Organisation.id, link missing cases via CrownDevelopmentToOrganisation */
	if (Array.isArray(toSave.manageApplicantDetails)) {
		const existingApplicantByOrgId = new Map(
			(dbViewModel.manageApplicantDetails || []).filter((o) => o?.id).map((o) => [o.id, o])
		);

		let createIndex = 0;
		for (const org of toSave.manageApplicantDetails) {
			if (!org) continue;

			// In this codebase, applicant organisations are considered "existing" if the join-row id
			// (CrownDevelopmentToOrganisation.id) is present. New rows may have a session-generated
			// id that is NOT a persisted Organisation.id.
			if (org.organisationRelationId) {
				if (!org.id) {
					throw new Error('Existing applicant organisation row is missing Organisation.id');
				}
				const existing = existingApplicantByOrgId.get(org.id);
				/** @type {import('@pins/crowndev-database').Prisma.OrganisationUpdateInput} */
				const organisationUpdate = {};

				if (Object.hasOwn(org, 'organisationName')) {
					const nextName = org.organisationName;
					const prevName = existing?.organisationName;
					if (typeof nextName === 'string' && nextName.length && nextName !== prevName) {
						organisationUpdate.name = nextName;
					}
				}

				if (Object.hasOwn(org, 'organisationAddress') && isAddress(org.organisationAddress)) {
					const prevAddress = existing && isAddress(existing.organisationAddress) ? existing.organisationAddress : null;
					if (!prevAddress || !isSameAddress(org.organisationAddress, prevAddress)) {
						const address = viewModelToAddressUpdateInput(org.organisationAddress);
						if (address) {
							const persisted = organisationById.get(org.id);
							const addressId =
								persisted?.addressId ?? persisted?.Address?.id ?? existing?.organisationAddressId ?? undefined;
							organisationUpdate.Address = {
								upsert: {
									where: optionalWhere(addressId),
									create: address,
									update: address
								}
							};
						}
					}
				}

				if (Object.keys(organisationUpdate).length > 0) {
					plan.shared.organisationUpdates.push({ organisationId: org.id, data: organisationUpdate });
				}

				for (const caseId of caseIds) {
					ensureLink(caseId, ORGANISATION_ROLES_ID.APPLICANT, org.id);
				}
				continue;
			}

			// New organisation: create once, then link to all cases.
			if (!org.organisationName) continue;
			const placeholderId = `${ORG_PLACEHOLDER_PREFIX}applicant:${createIndex++}`;

			/** @type {import('@pins/crowndev-database').Prisma.OrganisationCreateInput} */
			const orgCreate = { name: org.organisationName };
			if (isAddress(org.organisationAddress)) {
				const address = viewModelToAddressUpdateInput(org.organisationAddress);
				if (address) {
					orgCreate.Address = { create: address };
				}
			}
			plan.shared.organisationCreates.push({ placeholderId, data: orgCreate });
			for (const caseId of caseIds) {
				ensureLink(caseId, ORGANISATION_ROLES_ID.APPLICANT, placeholderId);
			}
		}
	}

	/** Agent org: update by Organisation.id; create once if missing (requires name); link missing cases */
	const hasAgentOrgNameEdit = Object.hasOwn(toSave, 'agentOrganisationName');
	const hasAgentOrgAddressEdit = Object.hasOwn(toSave, 'agentOrganisationAddress');
	if (hasAgentOrgNameEdit || hasAgentOrgAddressEdit) {
		const allRels = crownDevelopments.flatMap((cd) => cd?.Organisations || []);
		const existingAgentRel = allRels.find((r) => r.role === ORGANISATION_ROLES_ID.AGENT && r?.Organisation?.id);
		let agentOrgId = existingAgentRel?.Organisation?.id;
		let agentOrgAddressId = existingAgentRel?.Organisation?.addressId ?? existingAgentRel?.Organisation?.Address?.id;

		let agentOrgRef = agentOrgId;
		if (!agentOrgId) {
			if (toSave.agentOrganisationName) {
				const placeholderId = `${ORG_PLACEHOLDER_PREFIX}agent:0`;
				agentOrgRef = placeholderId;
				/** @type {import('@pins/crowndev-database').Prisma.OrganisationCreateInput} */
				const orgCreate = { name: toSave.agentOrganisationName };
				const address = viewModelToAddressUpdateInput(toSave.agentOrganisationAddress);
				if (address) {
					orgCreate.Address = { create: address };
				}
				plan.shared.organisationCreates.push({ placeholderId, data: orgCreate });
			} else {
				// No existing org and no name to create one: nothing to do.
				agentOrgRef = null;
			}
		}

		if (agentOrgRef) {
			for (const caseId of caseIds) {
				ensureLink(caseId, ORGANISATION_ROLES_ID.AGENT, agentOrgRef);
			}
		}

		if (agentOrgId) {
			/** @type {import('@pins/crowndev-database').Prisma.OrganisationUpdateInput} */
			const organisationUpdate = {};
			if (hasAgentOrgNameEdit && toSave.agentOrganisationName) {
				organisationUpdate.name = toSave.agentOrganisationName;
			}
			if (hasAgentOrgAddressEdit) {
				const address = viewModelToAddressUpdateInput(toSave.agentOrganisationAddress);
				if (address) {
					organisationUpdate.Address = {
						upsert: {
							where: optionalWhere(agentOrgAddressId),
							create: address,
							update: address
						}
					};
				}
			}
			if (Object.keys(organisationUpdate).length > 0) {
				plan.shared.organisationUpdates.push({ organisationId: agentOrgId, data: organisationUpdate });
			}
		}
	}

	/** Contact detail updates (by Contact.id) + join-table changes (by OrganisationToContact.id) */
	const existingApplicantByJoinId = new Map(
		(dbViewModel.manageApplicantContactDetails || [])
			.filter((c) => c?.organisationToContactRelationId)
			.map((c) => [c.organisationToContactRelationId, c])
	);
	const existingApplicantByContactId = new Map(
		(dbViewModel.manageApplicantContactDetails || []).filter((c) => c?.id).map((c) => [c.id, c])
	);
	const existingAgentByContactId = new Map(
		(dbViewModel.manageAgentContactDetails || []).filter((c) => c?.id).map((c) => [c.id, c])
	);

	if (Array.isArray(toSave.manageApplicantContactDetails)) {
		for (const contact of toSave.manageApplicantContactDetails) {
			if (!contact) continue;
			const targetOrgId = contact.applicantContactOrganisation;
			if (!targetOrgId) {
				throw new Error('Unable to match applicant contact to organisation - no valid selector');
			}

			// Details update (existing contact)
			if (contact.id && existingApplicantByContactId.has(contact.id)) {
				const existing = existingApplicantByContactId.get(contact.id);
				const newData = extractApplicantContactFields(contact);
				const existingData = extractApplicantContactFields(existing);
				const changed =
					newData.firstName !== existingData.firstName ||
					newData.lastName !== existingData.lastName ||
					newData.email !== existingData.email ||
					newData.telephoneNumber !== existingData.telephoneNumber;
				if (changed) {
					plan.shared.contactUpdates.push({ contactId: contact.id, data: newData });
				}
			}

			// New contact (no join row yet)
			if (!contact.organisationToContactRelationId) {
				const data = extractApplicantContactFields(contact);
				plan.shared.newOrganisationContacts.push({ organisationId: targetOrgId, data });
				continue;
			}

			// Existing join row: fail fast if unknown
			const existingJoin = existingApplicantByJoinId.get(contact.organisationToContactRelationId);
			if (!existingJoin) {
				throw new Error(
					`Unknown OrganisationToContact join row id "${contact.organisationToContactRelationId}" supplied in save payload`
				);
			}

			// Organisation change: move join row
			if (existingJoin.applicantContactOrganisation !== targetOrgId) {
				plan.shared.organisationToContactDeletes.push({ id: contact.organisationToContactRelationId });
				plan.shared.organisationToContactCreates.push({ organisationId: targetOrgId, contactId: existingJoin.id });
			}
		}
	}

	if (Array.isArray(toSave.manageAgentContactDetails)) {
		// Identify (or create) agent org selector for new-contact creates
		const allRels = crownDevelopments.flatMap((cd) => cd?.Organisations || []);
		const existingAgentRel = allRels.find((r) => r.role === ORGANISATION_ROLES_ID.AGENT && r?.Organisation?.id);
		const agentOrganisationId = existingAgentRel?.Organisation?.id;
		const plannedAgentOrgCreate = plan.shared.organisationCreates.find(
			(c) => c.placeholderId === `${ORG_PLACEHOLDER_PREFIX}agent:0`
		);
		const agentOrgRef = agentOrganisationId || (plannedAgentOrgCreate ? plannedAgentOrgCreate.placeholderId : null);

		for (const contact of toSave.manageAgentContactDetails) {
			if (!contact) continue;

			if (contact.id && existingAgentByContactId.has(contact.id)) {
				const existing = existingAgentByContactId.get(contact.id);
				const newData = extractAgentContactFields(contact);
				const existingData = extractAgentContactFields(existing);
				const changed =
					newData.firstName !== existingData.firstName ||
					newData.lastName !== existingData.lastName ||
					newData.email !== existingData.email ||
					newData.telephoneNumber !== existingData.telephoneNumber;
				if (changed) {
					plan.shared.contactUpdates.push({ contactId: contact.id, data: newData });
				}
				continue;
			}

			// New agent contact: requires an agent organisation (existing or being created this save)
			if (contact.organisationToContactRelationId) {
				// Existing join row with no details update: nothing to do.
				continue;
			}
			if (!agentOrgRef) {
				throw new Error('Unable to find agent organisation for this case - cannot create agent contacts');
			}
			const data = extractAgentContactFields(contact);
			plan.shared.newOrganisationContacts.push({ organisationId: agentOrgRef, data });
		}
	}

	return plan;
}

/**
 * Execute a write plan inside a Prisma interactive transaction.
 *
 * @param {CaseUpdateWritePlan} plan
 * @param {import('#service').ManageService['db']} tx
 */
export async function executeCaseUpdateWritePlan(plan, tx) {
	/** @type {Map<string, string>} */
	const createdOrgIds = new Map();
	const resolveOrgId = (id) => createdOrgIds.get(id) || id;

	for (const orgCreate of plan.shared.organisationCreates) {
		const created = await tx.organisation.create({ data: orgCreate.data, select: { id: true } });
		createdOrgIds.set(orgCreate.placeholderId, created.id);
	}

	for (const orgUpdate of plan.shared.organisationUpdates) {
		await tx.organisation.update({ where: { id: resolveOrgId(orgUpdate.organisationId) }, data: orgUpdate.data });
	}

	for (const linkCreate of plan.shared.linkCreates) {
		await tx.crownDevelopmentToOrganisation.create({
			data: {
				crownDevelopmentId: linkCreate.caseId,
				organisationId: resolveOrgId(linkCreate.organisationId),
				role: linkCreate.roleId
			}
		});
	}

	for (const contactUpdate of plan.shared.contactUpdates) {
		await tx.contact.update({ where: { id: contactUpdate.contactId }, data: contactUpdate.data });
	}

	for (const del of plan.shared.organisationToContactDeletes) {
		await tx.organisationToContact.delete({ where: { id: del.id } });
	}
	for (const create of plan.shared.organisationToContactCreates) {
		await tx.organisationToContact.create({
			data: { organisationId: resolveOrgId(create.organisationId), contactId: create.contactId }
		});
	}

	for (const newContact of plan.shared.newOrganisationContacts) {
		const createdContact = await tx.contact.create({ data: newContact.data, select: { id: true } });
		await tx.organisationToContact.create({
			data: { organisationId: resolveOrgId(newContact.organisationId), contactId: createdContact.id }
		});
	}

	for (const caseId of plan.scalarCaseUpdates.caseIds) {
		await tx.crownDevelopment.update({ where: { id: caseId }, data: plan.scalarCaseUpdates.updateInput });
	}
}

/**
 * Build current-case-only OrganisationToContact join updates as explicit operations.
 *
 * @param {import('#service').ManageService['db']} db
 * @param {string} id
 * @param {import('./types.js').CrownDevelopmentViewModel} toSave
 * @returns {Promise<PrismaPromise<unknown>[]>}
 */
export async function buildOrganisationContactJoinUpdateOperations(db, id, toSave) {
	const hasApplicantContactEdits = Object.hasOwn(toSave, 'manageApplicantContactDetails');
	const hasAgentContactEdits = Object.hasOwn(toSave, 'manageAgentContactDetails');
	if (!hasApplicantContactEdits && !hasAgentContactEdits) {
		return [];
	}

	const crownDevelopment = await db.crownDevelopment.findUnique({
		where: { id },
		include: {
			Organisations: {
				include: {
					Organisation: {
						include: {
							Address: true,
							OrganisationToContact: { include: { Contact: true } }
						}
					}
				}
			}
		}
	});
	if (!crownDevelopment) {
		return [];
	}

	/** @type {PrismaPromise<unknown>[]} */
	const operations = [];

	// Build minimal snapshot from the DB payload (avoid importing crownDevelopmentToViewModel to prevent cycles)
	const relationships = crownDevelopment.Organisations || [];

	const applicantOrgIds = new Set(
		relationships
			.filter((r) => r.role === ORGANISATION_ROLES_ID.APPLICANT)
			.map((r) => r.organisationId)
			.filter(Boolean)
	);

	/** @type {Map<string, { organisationId: string, contactId: string }>} */
	const existingJoinById = new Map();
	for (const rel of relationships) {
		const orgId = rel.organisationId;
		for (const join of rel?.Organisation?.OrganisationToContact || []) {
			if (join?.id && join?.contactId && orgId) {
				existingJoinById.set(join.id, { organisationId: orgId, contactId: join.contactId });
			}
		}
	}

	if (hasApplicantContactEdits && Array.isArray(toSave.manageApplicantContactDetails)) {
		for (const contact of toSave.manageApplicantContactDetails) {
			const targetOrgId = contact?.applicantContactOrganisation;
			if (!targetOrgId) {
				throw new Error('Unable to match applicant contact to organisation - no valid selector');
			}
			if (!applicantOrgIds.has(targetOrgId)) {
				throw new Error(
					`Found an orphaned contact with selector "${targetOrgId}" that does not match any organisation on this case`
				);
			}

			if (!contact?.organisationToContactRelationId) {
				const contactCreate = extractApplicantContactFields(contact);
				operations.push(
					db.organisationToContact.create({
						data: {
							organisationId: targetOrgId,
							Contact: { create: contactCreate }
						}
					})
				);
				continue;
			}

			const existing = existingJoinById.get(contact.organisationToContactRelationId);
			if (!existing) {
				throw new Error(
					`Unknown OrganisationToContact join row id "${contact.organisationToContactRelationId}" supplied in save payload`
				);
			}

			if (existing.organisationId === targetOrgId) {
				continue;
			}

			operations.push(db.organisationToContact.delete({ where: { id: contact.organisationToContactRelationId } }));
			operations.push(
				db.organisationToContact.create({
					data: {
						organisationId: targetOrgId,
						Contact: { connect: { id: existing.contactId } }
					}
				})
			);
		}
	}

	if (hasAgentContactEdits && Array.isArray(toSave.manageAgentContactDetails)) {
		const agentRel = relationships.find((r) => r.role === ORGANISATION_ROLES_ID.AGENT);
		const agentOrganisationId = agentRel?.organisationId;
		for (const contact of toSave.manageAgentContactDetails) {
			if (!contact) continue;
			if (contact.organisationToContactRelationId) continue;
			if (!agentOrganisationId) {
				throw new Error('Unable to find agent organisation for this case - cannot create agent contacts');
			}
			const contactCreate = extractAgentContactFields(contact);
			operations.push(
				db.organisationToContact.create({
					data: {
						organisationId: agentOrganisationId,
						Contact: { create: contactCreate }
					}
				})
			);
		}
	}

	return operations;
}

/**
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').ContactTypeValues} prefix
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.ContactUpdateOneWithoutCrownDevelopmentApplicantNestedInput|null}
 */
export function viewModelToNestedContactUpdate(edits, prefix, viewModel) {
	/** @type {import('@pins/crowndev-database').Prisma.ContactCreateInput} */
	const createInput = {};

	if (`${prefix}ContactName` in edits) {
		createInput.orgName = edits[`${prefix}ContactName`];
	}
	if (`${prefix}ContactTelephoneNumber` in edits) {
		createInput.telephoneNumber = edits[`${prefix}ContactTelephoneNumber`];
	}
	if (`${prefix}ContactEmail` in edits) {
		createInput.email = edits[`${prefix}ContactEmail`];
	}
	if (`${prefix}ContactAddress` in edits) {
		const addressUpdateInput = viewModelToAddressUpdateInput(edits[`${prefix}ContactAddress`]);
		createInput.Address = {
			create: addressUpdateInput
		};
	}
	if (Object.keys(createInput).length === 0) {
		return null;
	}
	const contactExists = Boolean(viewModel[`${prefix}ContactId`]);

	if (!contactExists) {
		return {
			create: createInput
		};
	}
	/** @type {import('@pins/crowndev-database').Prisma.ContactUpdateInput} */
	const updateInput = {
		...createInput
	};
	if (updateInput.Address) {
		const addressId = viewModel[`${prefix}ContactAddressId`];
		updateInput.Address = {
			upsert: {
				where: optionalWhere(addressId),
				create: updateInput.Address.create,
				update: updateInput.Address.create
			}
		};
	}
	return {
		update: updateInput
	};
}

/**
 * Build nested updates for agent organisation name.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput['Organisations']}
 */
export function buildAgentOrganisationNameUpdates(edits, viewModel) {
	if (!('agentOrganisationName' in edits) || !edits.agentOrganisationName) {
		return undefined;
	}

	if (!viewModel.agentOrganisationRelationId) {
		return {
			create: [
				{
					Role: { connect: { id: ORGANISATION_ROLES_ID.AGENT } },
					Organisation: {
						create: {
							name: edits.agentOrganisationName
						}
					}
				}
			]
		};
	}

	return {
		update: [
			{
				where: { id: viewModel.agentOrganisationRelationId },
				data: {
					Organisation: {
						update: { name: edits.agentOrganisationName }
					}
				}
			}
		]
	};
}

/**
 * Build nested updates for agent organisation address.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput['Organisations']}
 */
export function buildAgentOrganisationAddressUpdates(edits, viewModel) {
	if (!('agentOrganisationAddress' in edits)) {
		return undefined;
	}

	const agentAddress = edits.agentOrganisationAddress
		? viewModelToAddressUpdateInput(edits.agentOrganisationAddress)
		: null;
	if (!agentAddress) {
		return undefined;
	}

	if (!viewModel.agentOrganisationRelationId) {
		throw new Error('Unable to find agent organisation for this case - cannot update agent address');
	}

	return {
		update: [
			{
				where: { id: viewModel.agentOrganisationRelationId },
				data: {
					Organisation: {
						update: {
							Address: {
								upsert: {
									where: optionalWhere(viewModel.agentOrganisationAddressId),
									create: agentAddress,
									update: agentAddress
								}
							}
						}
					}
				}
			}
		]
	};
}

/**
 * Build create updates for agent organisation contacts.
 * Updates for existing contacts are handled separately.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput['Organisations']}
 */
export function buildAgentContactOrganisationUpdates(edits, viewModel) {
	const contacts = Array.isArray(edits.manageAgentContactDetails) ? edits.manageAgentContactDetails : [];
	const contactCreate = [];

	if (contacts.length === 0) {
		return undefined;
	}

	if (!viewModel.agentOrganisationRelationId) {
		throw new Error('Unable to find agent organisation for this case - cannot update agent contacts');
	}

	for (const contact of contacts) {
		// Only new contacts get created
		if (contact.organisationToContactRelationId) {
			continue;
		}

		const individualContactCreate = extractAgentContactFields(contact);
		contactCreate.push({
			Contact: { create: individualContactCreate }
		});
	}

	if (contactCreate.length === 0) {
		return undefined;
	}

	return {
		update: [
			{
				where: { id: viewModel.agentOrganisationRelationId },
				data: {
					Organisation: {
						update: {
							OrganisationToContact: { create: contactCreate }
						}
					}
				}
			}
		]
	};
}

/**
 * Build nested updates for applicant organisations.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput['Organisations']}
 */
export function buildApplicantOrganisationUpdates(edits, viewModel) {
	const organisations = Array.isArray(edits.manageApplicantDetails) ? edits.manageApplicantDetails : [];
	if (organisations.length === 0) {
		return undefined;
	}

	const existingByRelationId = new Map(
		(viewModel.manageApplicantDetails || [])
			.map(
				(organisation) =>
					/** @type {readonly [string, import('./types.js').ManageApplicantDetails]} */ ([
						organisation.organisationRelationId,
						organisation
					])
			)
			.filter(([key]) => typeof key === 'string' && key.length)
	);

	/** @type {import('./types.js').ManageApplicantDetails[]} **/
	const update = [];
	/** @type {import('./types.js').ManageApplicantDetails[]} **/
	const create = [];

	organisations.forEach((organisation) => {
		if (!organisation.organisationRelationId) {
			create.push(organisation);
			return;
		}
		update.push(organisation);
	});

	/** @type {import('@pins/crowndev-database').Prisma.CrownDevelopmentToOrganisationCreateWithoutCrownDevelopmentInput[]} */
	const createOperations = create.map((organisation) => {
		/** @type {any} */
		const createOperation = {
			Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
			Organisation: {
				create: {
					name: organisation.organisationName
				}
			}
		};

		const address =
			organisation.organisationAddress && isAddress(organisation.organisationAddress)
				? viewModelToAddressUpdateInput(organisation.organisationAddress)
				: null;
		if (address) {
			createOperation.Organisation.create.Address = {
				create: address
			};
		}

		return createOperation;
	});

	/** @type {import('@pins/crowndev-database').Prisma.CrownDevelopmentToOrganisationUpdateWithWhereUniqueWithoutCrownDevelopmentInput[]} */
	const updateOperations = update
		.map((organisation) => {
			const existing = existingByRelationId.get(organisation.organisationRelationId);

			const nameChanged = !existing || (organisation.organisationName ?? '') !== (existing.organisationName ?? '');

			const existingAddress =
				existing && isAddress(existing.organisationAddress) ? existing.organisationAddress : undefined;

			const addressChanged =
				isAddress(organisation.organisationAddress) &&
				(!existingAddress || !isSameAddress(organisation.organisationAddress, existingAddress));

			if (!nameChanged && !addressChanged) {
				return;
			}

			/** @type {import('@pins/crowndev-database').Prisma.OrganisationUpdateInput} */
			const organisationUpdate = {};

			if (nameChanged) {
				organisationUpdate.name = organisation.organisationName;
			}

			if (addressChanged) {
				const address =
					organisation.organisationAddress && isAddress(organisation.organisationAddress)
						? viewModelToAddressUpdateInput(organisation.organisationAddress)
						: null;

				if (address) {
					organisationUpdate.Address = {
						upsert: {
							where: optionalWhere(existing?.organisationAddressId),
							create: address,
							update: address
						}
					};
				}
			}

			if (Object.keys(organisationUpdate).length === 0) {
				return;
			}

			return {
				where: { id: organisation.organisationRelationId },
				data: {
					Organisation: {
						update: organisationUpdate
					}
				}
			};
		})
		.filter(isDefined);

	if (updateOperations.length === 0 && createOperations.length === 0) {
		return undefined;
	}

	return {
		update: updateOperations,
		create: createOperations
	};
}

/**
 * Build nested updates for applicant organisation contacts.
 *
 * @param {import('./types.js').CrownDevelopmentViewModel} edits
 * @param {import('./types.js').CrownDevelopmentViewModel} viewModel
 * @returns {import('@pins/crowndev-database').Prisma.CrownDevelopmentUpdateInput['Organisations']}
 */
export function buildApplicantContactOrganisationUpdates(edits, viewModel) {
	const contacts = Array.isArray(edits.manageApplicantContactDetails) ? edits.manageApplicantContactDetails : [];
	if (contacts.length === 0) {
		return undefined;
	}

	/** @type {Map<string, string>} */
	const orgIdToRelationId = new Map(
		(viewModel.manageApplicantDetails || [])
			.map(
				(organisation) =>
					/** @type {readonly [string, string]} */ ([organisation?.id, organisation?.organisationRelationId])
			)
			.filter((pair) => pair[0] && pair[1])
	);

	/** @type {Map<string, {organisationId: string, contactId: string}>} */
	const existingRelationToOrgAndContact = new Map(
		(viewModel.manageApplicantContactDetails || [])
			.map(
				(contact) =>
					/** @type {[string, {organisationId: string, contactId: string}]} */ ([
						contact?.organisationToContactRelationId,
						{ organisationId: contact?.applicantContactOrganisation, contactId: contact?.id }
					])
			)
			.filter(
				(pair) =>
					typeof pair[0] === 'string' &&
					typeof pair[1]?.organisationId === 'string' &&
					typeof pair[1]?.contactId === 'string'
			)
	);

	/** @type {Map<string, {create: any[], deleteMany: any[]}>} */
	const byRelation = new Map();

	/**
	 * @typedef {Object} OrganisationRelationBucket
	 * @property {Array<{Contact: {create: any} | {connect: {id: string}}}>} create
	 * @property {Array<{id: string}>} deleteMany
	 */

	/**
	 * @param {string} relationId
	 * @returns {OrganisationRelationBucket}
	 */
	const ensureBucket = (relationId) => {
		if (!byRelation.has(relationId)) byRelation.set(relationId, { create: [], deleteMany: [] });
		const bucket = byRelation.get(relationId);
		if (!bucket) throw new Error('Failed to initialize bucket for organisation relation selector');
		return bucket;
	};

	for (const contact of contacts) {
		const targetOrganisationId = contact?.applicantContactOrganisation;
		if (!targetOrganisationId) {
			throw new Error('Unable to match applicant contact to organisation - no valid selector');
		}

		const targetRelationId = orgIdToRelationId.get(targetOrganisationId);
		if (!targetRelationId) {
			throw new Error(
				`Found an orphaned contact with selector "${targetOrganisationId}" that does not match any organisation on this case`
			);
		}

		if (!contact.organisationToContactRelationId) {
			const contactCreate = extractApplicantContactFields(contact);
			ensureBucket(targetRelationId).create.push({
				Contact: { create: contactCreate }
			});
			continue;
		}

		const existing = existingRelationToOrgAndContact.get(contact.organisationToContactRelationId);
		if (!existing) {
			throw new Error(
				`Unknown OrganisationToContact join row id "${contact.organisationToContactRelationId}" supplied in save payload`
			);
		}

		const isChangingOrganisation = existing.organisationId !== targetOrganisationId;
		if (!isChangingOrganisation) {
			continue;
		}

		const sourceRelationId = orgIdToRelationId.get(existing.organisationId);
		if (!sourceRelationId) {
			throw new Error(
				`Unable to move contact - source organisation "${existing.organisationId}" is not present on this case`
			);
		}

		ensureBucket(sourceRelationId).deleteMany.push({ id: contact.organisationToContactRelationId });
		ensureBucket(targetRelationId).create.push({
			Contact: { connect: { id: existing.contactId } }
		});
	}

	const updateOperations = Array.from(byRelation.entries())
		.map(([relationId, operations]) => {
			/** @type {any} */
			const organisationToContact = {};
			if (operations.create.length) organisationToContact.create = operations.create;
			if (operations.deleteMany.length) organisationToContact.deleteMany = operations.deleteMany;

			return {
				where: { id: relationId },
				data: {
					Organisation: {
						update: {
							OrganisationToContact: organisationToContact
						}
					}
				}
			};
		})
		.filter(isDefined);

	return { update: updateOperations };
}
