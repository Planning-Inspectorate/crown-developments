import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { optionalWhere } from '@pins/crowndev-lib/util/database.js';
import { viewModelToAddressUpdateInput, isAddress, isSameAddress } from '@pins/crowndev-lib/util/address.ts';
import { extractApplicantContactFields, extractAgentContactFields } from '../util/contact.js';
import { isDefined } from '@pins/crowndev-lib/util/boolean.js';
import type {
	CrownDevelopmentViewModel,
	CrownDevelopmentPayload,
	ContactTypeValues,
	ManageApplicantDetails,
	ManageAgentContactDetails,
	ManageApplicantContactDetails
} from './types.js';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import type { ManageService } from '#service';

type CaseUpdateWritePlan = {
	scalarCaseUpdates: { caseIds: string[]; updateInput: Prisma.CrownDevelopmentUpdateInput };
	siteAddressUpdate?: { addressId: string | null; addressData: Prisma.AddressUpdateInput } | null;
	siteAddressCreateData?: Prisma.AddressCreateInput;
	organisationGraph: {
		organisationCreates: Array<{ placeholderId: string; data: Prisma.OrganisationCreateInput }>;
		organisationUpdates: Array<{ organisationId: string; data: Prisma.OrganisationUpdateInput }>;
		linkCreates: Array<{ caseId: string; organisationId: string; roleId: string }>;
		contactUpdates: Array<{ contactId: string; data: Prisma.ContactUpdateInput }>;
		newOrganisationContacts: Array<{ organisationId: string; data: Prisma.ContactCreateInput }>;
		organisationToContactDeletes: Array<{ id: string }>;
		organisationToContactCreates: Array<{ organisationId: string; contactId: string }>;
	};
};

const ORG_PLACEHOLDER_PREFIX = '__new_org__:';

type ContactCoreFields = Pick<Prisma.ContactCreateInput, 'firstName' | 'lastName' | 'telephoneNumber' | 'email'>;

/**
 * Have any of the core contact fields changed?
 */
function contactCoreFieldsChanged(next: ContactCoreFields, prev: ContactCoreFields) {
	return (
		next.firstName !== prev.firstName ||
		next.lastName !== prev.lastName ||
		next.email !== prev.email ||
		next.telephoneNumber !== prev.telephoneNumber
	);
}

/**
 * Add contact update to the write plan if any core contact fields have changed compared to the existing DB values.
 */
function queueContactUpdateIfChanged<TContact extends { id?: string | null }>({
	contact,
	existingByContactId,
	plan,
	extractFields
}: {
	contact: TContact;
	existingByContactId: Map<string, TContact>;
	plan: CaseUpdateWritePlan;
	extractFields: (contact: TContact) => ContactCoreFields;
}): boolean {
	if (!contact.id) return false;
	const existing = existingByContactId.get(contact.id);
	if (!existing) return false;

	const nextData = extractFields(contact);
	const prevData = extractFields(existing);
	if (contactCoreFieldsChanged(nextData, prevData)) {
		plan.organisationGraph.contactUpdates.push({ contactId: contact.id, data: nextData });
	}

	return true;
}

/**
 * Whether the save payload contains any fields that require organisation/contact writes.
 */
export function hasOrganisationWriteEdits(toSave: CrownDevelopmentViewModel): boolean {
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
 */
export function buildCaseUpdateWritePlan({
	toSave,
	dbViewModel,
	caseIds,
	scalarUpdateInput,
	crownDevelopments,
	sharedSiteAddressId
}: {
	toSave: Partial<CrownDevelopmentViewModel>;
	dbViewModel: CrownDevelopmentViewModel;
	caseIds: string[];
	scalarUpdateInput: Prisma.CrownDevelopmentUpdateInput;
	crownDevelopments: CrownDevelopmentPayload[];
	sharedSiteAddressId?: string | null;
}): CaseUpdateWritePlan {
	const plan: CaseUpdateWritePlan = {
		scalarCaseUpdates: { caseIds, updateInput: scalarUpdateInput },
		organisationGraph: {
			organisationCreates: [],
			organisationUpdates: [],
			linkCreates: [],
			contactUpdates: [],
			newOrganisationContacts: [],
			organisationToContactDeletes: [],
			organisationToContactCreates: []
		}
	};

	if (caseIds.length > 1 && scalarUpdateInput.SiteAddress && 'upsert' in scalarUpdateInput.SiteAddress) {
		const upsert = scalarUpdateInput.SiteAddress.upsert;
		if (upsert) {
			const addressData = {
				create: upsert.create,
				update: upsert.update
			};

			plan.siteAddressUpdate = {
				addressId: sharedSiteAddressId ?? null,
				addressData: addressData.update
			};

			plan.siteAddressCreateData = addressData.create;

			delete scalarUpdateInput.SiteAddress;
		}
	}

	const existingLinks = new Set();
	const organisationById: Map<string, Prisma.OrganisationGetPayload<object>> = new Map();

	for (const crownDevelopment of crownDevelopments) {
		for (const relationship of crownDevelopment?.Organisations || []) {
			existingLinks.add(`${crownDevelopment.id}:${relationship.role}:${relationship.organisationId}`);
			if (relationship?.Organisation?.id) {
				organisationById.set(relationship.Organisation.id, relationship.Organisation);
			}
		}
	}

	const ensureLink = (caseId: string, roleId: string, organisationId: string) => {
		const key = `${caseId}:${roleId}:${organisationId}`;
		if (existingLinks.has(key)) return;
		existingLinks.add(key);
		plan.organisationGraph.linkCreates.push({ caseId, roleId, organisationId });
	};

	/** Applicant orgs: create once, update by Organisation.id, link missing cases via CrownDevelopmentToOrganisation */
	if (Array.isArray(toSave.manageApplicantDetails)) {
		const existingApplicantByOrgId = new Map(
			(dbViewModel.manageApplicantDetails || [])
				.filter((organisationDetails) => organisationDetails?.id)
				.map((organisationDetails) => [organisationDetails.id, organisationDetails])
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
				const organisationUpdate: Prisma.OrganisationUpdateInput = {};

				if (Object.hasOwn(org, 'organisationName')) {
					const nextName = org.organisationName;
					const prevName = existing?.organisationName;
					if (nextName.length && nextName !== prevName) {
						organisationUpdate.name = nextName;
					}
				}

				if (Object.hasOwn(org, 'organisationAddress') && isAddress(org.organisationAddress)) {
					const prevAddress = existing && isAddress(existing.organisationAddress) ? existing.organisationAddress : null;
					if (!prevAddress || !isSameAddress(org.organisationAddress, prevAddress)) {
						const address = viewModelToAddressUpdateInput(org.organisationAddress);
						const persisted = organisationById.get(org.id);
						const addressId = persisted?.addressId ?? existing?.organisationAddressId ?? undefined;
						organisationUpdate.Address = {
							upsert: {
								where: optionalWhere(addressId),
								create: address,
								update: address
							}
						};
					}
				}

				if (Object.keys(organisationUpdate).length > 0) {
					plan.organisationGraph.organisationUpdates.push({ organisationId: org.id, data: organisationUpdate });
				}

				for (const caseId of caseIds) {
					ensureLink(caseId, ORGANISATION_ROLES_ID.APPLICANT, org.id);
				}
				continue;
			}

			// New organisation: create once, then link to all cases.
			if (!org.organisationName) continue;
			const placeholderId = `${ORG_PLACEHOLDER_PREFIX}applicant:${createIndex++}`;

			const orgCreate: Prisma.OrganisationCreateInput = { name: org.organisationName };
			if (isAddress(org.organisationAddress)) {
				const address = viewModelToAddressUpdateInput(org.organisationAddress);
				if (address) {
					orgCreate.Address = { create: address };
				}
			}
			plan.organisationGraph.organisationCreates.push({ placeholderId, data: orgCreate });
			for (const caseId of caseIds) {
				ensureLink(caseId, ORGANISATION_ROLES_ID.APPLICANT, placeholderId);
			}
		}
	}

	/** Agent org: update by Organisation.id; create once if missing (requires name); link missing cases */
	const hasAgentOrgNameEdit = Object.hasOwn(toSave, 'agentOrganisationName');
	const hasAgentOrgAddressEdit = Object.hasOwn(toSave, 'agentOrganisationAddress');
	if (hasAgentOrgNameEdit || hasAgentOrgAddressEdit) {
		const allRelationships = crownDevelopments.flatMap((crownDevelopment) => crownDevelopment?.Organisations || []);
		const existingAgentRel = allRelationships.find(
			(relationship) => relationship.role === ORGANISATION_ROLES_ID.AGENT && relationship?.Organisation?.id
		);
		const agentOrgId = existingAgentRel?.Organisation?.id;
		const agentOrgAddressId = existingAgentRel?.Organisation?.addressId ?? existingAgentRel?.Organisation?.Address?.id;

		let agentOrgRef: string | null | undefined = agentOrgId;
		if (!agentOrgId) {
			if (toSave.agentOrganisationName) {
				const placeholderId = `${ORG_PLACEHOLDER_PREFIX}agent:0`;
				agentOrgRef = placeholderId;
				const orgCreate: Prisma.OrganisationCreateInput = { name: toSave.agentOrganisationName };
				const address = isAddress(toSave.agentOrganisationAddress)
					? viewModelToAddressUpdateInput(toSave.agentOrganisationAddress)
					: null;
				if (address) {
					orgCreate.Address = { create: address };
				}
				plan.organisationGraph.organisationCreates.push({ placeholderId, data: orgCreate });
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
			const organisationUpdate: Prisma.OrganisationUpdateInput = {};
			if (hasAgentOrgNameEdit && toSave.agentOrganisationName) {
				organisationUpdate.name = toSave.agentOrganisationName;
			}
			if (hasAgentOrgAddressEdit) {
				const address = isAddress(toSave.agentOrganisationAddress)
					? viewModelToAddressUpdateInput(toSave.agentOrganisationAddress)
					: null;
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
				plan.organisationGraph.organisationUpdates.push({ organisationId: agentOrgId, data: organisationUpdate });
			}
		}
	}

	/** Contact detail updates (by Contact.id) + join-table changes (by OrganisationToContact.id) */
	// Invariant (Manage UI): applicant organisations are saved on a separate step *before* applicant contacts.
	// Therefore, any applicant contact create/move operation must reference a persisted Organisation.id.
	// If the UI flow changes to allow creating a new organisation + new contact in the same save payload,
	// this section must be updated to translate session selector ids to the organisation placeholder ids
	// created earlier in this write-plan.
	const persistedApplicantOrganisationIds = new Set(
		crownDevelopments
			.flatMap((crownDevelopment) => crownDevelopment?.Organisations || [])
			.filter((relationship) => relationship?.role === ORGANISATION_ROLES_ID.APPLICANT)
			.map((relationship) => relationship?.organisationId)
			.filter((id) => typeof id === 'string' && id.length)
	);

	const existingApplicantByJoinId = new Map<string, ManageApplicantContactDetails>(
		(dbViewModel.manageApplicantContactDetails || [])
			.filter((contactDetails) => contactDetails?.organisationToContactRelationId)
			.map((contactDetails) => [contactDetails.organisationToContactRelationId, contactDetails])
	);
	const existingApplicantByContactId = new Map<string, ManageApplicantContactDetails>(
		(dbViewModel.manageApplicantContactDetails || [])
			.filter((contactDetails) => contactDetails?.id)
			.map((contactDetails) => [contactDetails.id, contactDetails])
	);
	const existingAgentByContactId = new Map<string, ManageAgentContactDetails>(
		(dbViewModel.manageAgentContactDetails || [])
			.filter((contactDetails) => contactDetails?.id)
			.map((contactDetails) => [contactDetails.id, contactDetails])
	);

	if (Array.isArray(toSave.manageApplicantContactDetails)) {
		for (const contact of toSave.manageApplicantContactDetails) {
			if (!contact) continue;
			const targetOrgId = contact.applicantContactOrganisation;
			if (!targetOrgId) {
				throw new Error('Unable to match applicant contact to organisation - no valid selector');
			}

			// Details update (existing contact)
			queueContactUpdateIfChanged({
				contact,
				existingByContactId: existingApplicantByContactId,
				plan,
				extractFields: extractApplicantContactFields
			});

			// New contact (no join row yet)
			if (!contact.organisationToContactRelationId) {
				if (!persistedApplicantOrganisationIds.has(targetOrgId)) {
					throw new Error(
						`Cannot create a new applicant contact linked to organisation "${targetOrgId}" because it is not a persisted Organisation.id. ` +
							`This should not be sent by the Manage UI (organisations are saved before contacts).`
					);
				}
				const data = extractApplicantContactFields(contact);
				plan.organisationGraph.newOrganisationContacts.push({ organisationId: targetOrgId, data });
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
				if (!persistedApplicantOrganisationIds.has(targetOrgId)) {
					throw new Error(
						`Cannot move an applicant contact to organisation "${targetOrgId}" because it is not a persisted Organisation.id. ` +
							`This should not be sent by the Manage UI (organisations are saved before contacts).`
					);
				}
				plan.organisationGraph.organisationToContactDeletes.push({ id: contact.organisationToContactRelationId });
				plan.organisationGraph.organisationToContactCreates.push({
					organisationId: targetOrgId,
					contactId: existingJoin.id
				});
			}
		}
	}

	if (Array.isArray(toSave.manageAgentContactDetails)) {
		// Identify (or create) agent org selector for new-contact creates
		const allRelationships = crownDevelopments.flatMap((crownDevelopment) => crownDevelopment?.Organisations || []);
		const existingAgentRel = allRelationships.find(
			(relationship) => relationship.role === ORGANISATION_ROLES_ID.AGENT && relationship?.Organisation?.id
		);
		const agentOrganisationId = existingAgentRel?.Organisation?.id;
		const plannedAgentOrgCreate = plan.organisationGraph.organisationCreates.find(
			(organisationCreatePlanItem) => organisationCreatePlanItem.placeholderId === `${ORG_PLACEHOLDER_PREFIX}agent:0`
		);
		const agentOrgRef = agentOrganisationId || (plannedAgentOrgCreate ? plannedAgentOrgCreate.placeholderId : null);

		for (const contact of toSave.manageAgentContactDetails) {
			if (!contact) continue;

			if (
				queueContactUpdateIfChanged({
					contact,
					existingByContactId: existingAgentByContactId,
					plan,
					extractFields: extractAgentContactFields
				})
			) {
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
			plan.organisationGraph.newOrganisationContacts.push({ organisationId: agentOrgRef, data });
		}
	}

	return plan;
}

/**
 * Execute a write plan inside a Prisma interactive transaction.
 */
export async function executeCaseUpdateWritePlan(plan: CaseUpdateWritePlan, tx: ManageService['db']) {
	const createdOrgIds: Map<string, string> = new Map();
	const resolveOrgId = (id: string) => createdOrgIds.get(id) || id;

	let sharedSiteAddressId: string | null = null;
	if (plan.siteAddressUpdate) {
		const { addressId, addressData } = plan.siteAddressUpdate;

		if (addressId) {
			await tx.address.update({ where: { id: addressId }, data: addressData });
			sharedSiteAddressId = addressId;
		} else {
			if (!plan.siteAddressCreateData) {
				throw new Error('Missing AddressCreateInput for shared site address creation');
			}
			const created = await tx.address.create({ data: plan.siteAddressCreateData });
			sharedSiteAddressId = created.id;
		}
	}

	for (const orgCreate of plan.organisationGraph.organisationCreates) {
		const created = await tx.organisation.create({ data: orgCreate.data, select: { id: true } });
		createdOrgIds.set(orgCreate.placeholderId, created.id);
	}

	for (const orgUpdate of plan.organisationGraph.organisationUpdates) {
		await tx.organisation.update({ where: { id: resolveOrgId(orgUpdate.organisationId) }, data: orgUpdate.data });
	}

	for (const linkCreate of plan.organisationGraph.linkCreates) {
		await tx.crownDevelopmentToOrganisation.create({
			data: {
				crownDevelopmentId: linkCreate.caseId,
				organisationId: resolveOrgId(linkCreate.organisationId),
				role: linkCreate.roleId
			}
		});
	}

	for (const contactUpdate of plan.organisationGraph.contactUpdates) {
		await tx.contact.update({ where: { id: contactUpdate.contactId }, data: contactUpdate.data });
	}

	for (const del of plan.organisationGraph.organisationToContactDeletes) {
		await tx.organisationToContact.delete({ where: { id: del.id } });
	}
	for (const create of plan.organisationGraph.organisationToContactCreates) {
		await tx.organisationToContact.create({
			data: { organisationId: resolveOrgId(create.organisationId), contactId: create.contactId }
		});
	}

	for (const newContact of plan.organisationGraph.newOrganisationContacts) {
		const createdContact = await tx.contact.create({ data: newContact.data, select: { id: true } });
		await tx.organisationToContact.create({
			data: { organisationId: resolveOrgId(newContact.organisationId), contactId: createdContact.id }
		});
	}
	for (const caseId of plan.scalarCaseUpdates.caseIds) {
		const updateData = { ...plan.scalarCaseUpdates.updateInput };

		if (sharedSiteAddressId) {
			updateData.SiteAddress = { connect: { id: sharedSiteAddressId } };
		}

		await tx.crownDevelopment.update({ where: { id: caseId }, data: updateData });
	}
}

/**
 * Build nested updates for applicant/agent contact creates/updates, returning null if no contact-related fields are being edited.
 */
export function viewModelToNestedContactUpdate(
	edits: Partial<CrownDevelopmentViewModel>,
	prefix: ContactTypeValues,
	viewModel: CrownDevelopmentViewModel
): Prisma.ContactUpdateOneWithoutCrownDevelopmentApplicantNestedInput | null {
	const createInput: Prisma.ContactCreateInput = {};

	if (`${prefix}ContactName` in edits) {
		createInput.orgName = edits[`${prefix}ContactName`];
	}
	if (`${prefix}ContactTelephoneNumber` in edits) {
		createInput.telephoneNumber = edits[`${prefix}ContactTelephoneNumber`];
	}
	if (`${prefix}ContactEmail` in edits) {
		createInput.email = edits[`${prefix}ContactEmail`];
	}
	const addressKey = `${prefix}ContactAddress` as const;
	if (addressKey in edits && isAddress(edits[addressKey])) {
		createInput.Address = {
			create: viewModelToAddressUpdateInput(edits[addressKey])
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

	const updateInput: Prisma.ContactUpdateInput = {
		...createInput
	};
	if (updateInput.Address?.create) {
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
 */
export function buildAgentOrganisationNameUpdates(
	edits: Partial<CrownDevelopmentViewModel>,
	viewModel: CrownDevelopmentViewModel
): Prisma.CrownDevelopmentUpdateInput['Organisations'] | undefined {
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
 */
export function buildAgentOrganisationAddressUpdates(
	edits: Partial<CrownDevelopmentViewModel>,
	viewModel: CrownDevelopmentViewModel
): Prisma.CrownDevelopmentUpdateInput['Organisations'] | undefined {
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
 */
export function buildAgentContactOrganisationUpdates(
	edits: Partial<CrownDevelopmentViewModel>,
	viewModel: CrownDevelopmentViewModel
): Prisma.CrownDevelopmentUpdateInput['Organisations'] | undefined {
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
 */
export function buildApplicantOrganisationUpdates(
	edits: Partial<CrownDevelopmentViewModel>,
	viewModel: CrownDevelopmentViewModel
): Prisma.CrownDevelopmentUpdateInput['Organisations'] | undefined {
	const organisations = Array.isArray(edits.manageApplicantDetails) ? edits.manageApplicantDetails : [];
	if (organisations.length === 0) {
		return undefined;
	}

	const existingByRelationId = new Map(
		(viewModel.manageApplicantDetails || [])
			.map((organisation): [string, ManageApplicantDetails] => [organisation.organisationRelationId, organisation])
			.filter(([key]) => key.length)
	);

	const update: ManageApplicantDetails[] = [];
	const create: ManageApplicantDetails[] = [];

	organisations.forEach((organisation) => {
		if (!organisation.organisationRelationId) {
			create.push(organisation);
			return;
		}
		update.push(organisation);
	});

	const createOperations: Prisma.CrownDevelopmentToOrganisationCreateWithoutCrownDevelopmentInput[] = create.map(
		(organisation) => {
			// Derive the exact nested `Organisation.create` type from Prisma so TS knows what shape is valid.
			type OrganisationNestedCreate = NonNullable<
				NonNullable<Prisma.CrownDevelopmentToOrganisationCreateWithoutCrownDevelopmentInput['Organisation']>['create']
			>;

			const address =
				organisation.organisationAddress && isAddress(organisation.organisationAddress)
					? viewModelToAddressUpdateInput(organisation.organisationAddress)
					: null;

			const organisationCreate: OrganisationNestedCreate = {
				name: organisation.organisationName,
				...(address ? { Address: { create: address } } : {})
			};

			const createOperation: Prisma.CrownDevelopmentToOrganisationCreateWithoutCrownDevelopmentInput = {
				Role: { connect: { id: ORGANISATION_ROLES_ID.APPLICANT } },
				Organisation: {
					create: organisationCreate
				}
			};

			return createOperation;
		}
	);

	const updateOperations: Prisma.CrownDevelopmentToOrganisationUpdateWithWhereUniqueWithoutCrownDevelopmentInput[] =
		update
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

				const organisationUpdate: Prisma.OrganisationUpdateInput = {};

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
 */
export function buildApplicantContactOrganisationUpdates(
	edits: Partial<CrownDevelopmentViewModel>,
	viewModel: CrownDevelopmentViewModel
): Prisma.CrownDevelopmentUpdateInput['Organisations'] | undefined {
	const contacts = Array.isArray(edits.manageApplicantContactDetails) ? edits.manageApplicantContactDetails : [];
	if (contacts.length === 0) {
		return undefined;
	}

	const orgIdToRelationId: Map<string, string> = new Map(
		(viewModel.manageApplicantDetails || [])
			.map((organisation): [string, string] => [organisation?.id, organisation?.organisationRelationId])
			.filter((pair) => pair[0] && pair[1])
	);

	const existingRelationToOrgAndContact: Map<string, { organisationId: string; contactId: string }> = new Map(
		(viewModel.manageApplicantContactDetails || [])
			.map((contact): [string, { organisationId: string; contactId: string }] => [
				contact?.organisationToContactRelationId,
				{ organisationId: contact?.applicantContactOrganisation, contactId: contact?.id }
			])
			.filter(
				(pair) =>
					typeof pair[0] === 'string' &&
					typeof pair[1]?.organisationId === 'string' &&
					typeof pair[1]?.contactId === 'string'
			)
	);

	type OrganisationRelationBucket = {
		create: Array<{ Contact: { create: Record<string, unknown> } | { connect: { id: string } } }>;
		deleteMany: Array<{ id: string }>;
	};

	const byRelation: Map<string, OrganisationRelationBucket> = new Map();

	const ensureBucket = (relationId: string): OrganisationRelationBucket => {
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
			const organisationToContact: Record<string, unknown> = {};
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
