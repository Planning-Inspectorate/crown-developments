import type { ManageService } from '#service';
import { ORGANISATION_ROLES_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

/**
 * Class that handles the deleting of complicated contacts / organisation joins.
 *
 * E.g. If you delete an organisation that has some contacts, we make sure
 * to break the joins and delete the contacts as well.
 *
 * If you want to delete just a contact linked to an agent org, we make sure
 * to break the links and delete the contact but keep the original organisation.
 */
export class S62aManageListDeleter {
	private db: ManageService['db'];
	private logger: ManageService['logger'];

	constructor(service: ManageService) {
		this.db = service.db;
		this.logger = service.logger;
	}

	/**
	 * Handles the deletion of the organisations and their contacts.
	 * Deletes the join, the organisation, the address, and then the contacts,
	 * in that order.
	 */
	public async deleteApplicantOrganisations(id: string, manageListItemId: string): Promise<void> {
		await this.db.s62aToApplicant.deleteMany({
			where: {
				s62aId: id,
				organisationId: manageListItemId,
				roleId: ORGANISATION_ROLES_ID.APPLICANT
			}
		});

		try {
			const stillReferenced = await this.db.s62aToApplicant.findFirst({ where: { organisationId: manageListItemId } });
			if (stillReferenced) return;

			const organisation = await this.db.organisation.findUnique({
				where: { id: manageListItemId },
				select: { addressId: true }
			});

			const contacts = await this.db.organisationToContact.findMany({
				where: { organisationId: manageListItemId },
				select: { contactId: true }
			});

			await this.db.$transaction([
				this.db.organisationToContact.deleteMany({ where: { organisationId: manageListItemId } }),
				this.db.organisation.delete({ where: { id: manageListItemId } })
			]);

			if (organisation?.addressId) {
				await this.db.address
					.delete({ where: { id: organisation.addressId } })
					.catch((err) =>
						this.logger.warn(
							{ id, manageListItemId, addressId: organisation.addressId, err },
							'Unable to delete address record.'
						)
					);
			}

			const contactIds = contacts.map((c) => c.contactId);
			if (contactIds.length) {
				await this.db.contact
					.deleteMany({
						where: { id: { in: contactIds }, OrganisationToContact: { none: {} } }
					})
					.catch((err) =>
						this.logger.warn({ id, manageListItemId, err }, 'Unable to delete contact record linked to organisation.')
					);
			}
		} catch (error) {
			this.logger.warn(
				{ id, manageListItemId, err: error },
				'Unable to delete Organisation record (may still be referenced)'
			);
		}
	}

	/**
	 * Deletes the joins when an applicant contact is deleted. Handles both the scenarios where
	 * this item was a contact associated via an organisation, and where the contact was a direct
	 * association with the case.
	 *
	 * And then deletes the contact.
	 */
	public async deleteApplicantContactDetails(id: string, manageListItemId: string): Promise<void> {
		await this.db.s62aToApplicant.deleteMany({
			where: { s62aId: id, contactId: manageListItemId, roleId: ORGANISATION_ROLES_ID.APPLICANT }
		});

		await this.db.organisationToContact.deleteMany({
			where: {
				contactId: manageListItemId,
				Organisation: { S62aToApplicants: { some: { s62aId: id, roleId: ORGANISATION_ROLES_ID.APPLICANT } } }
			}
		});

		try {
			await this.db.contact.delete({ where: { id: manageListItemId } });
		} catch (error) {
			this.logger.warn(
				{ id, manageListItemId, err: error },
				'Unable to delete Contact record (may still be referenced)'
			);
		}
	}

	/**
	 * Handles the deletion of the agent contacts joins then contact. Simpler than others
	 * because agent contacts must be associated with a single organisation.
	 */
	public async deleteAgentContactDetails(id: string, manageListItemId: string): Promise<void> {
		await this.db.organisationToContact.deleteMany({
			where: {
				contactId: manageListItemId,
				Organisation: { S62aToApplicants: { some: { s62aId: id, roleId: ORGANISATION_ROLES_ID.AGENT } } }
			}
		});

		try {
			await this.db.contact.delete({ where: { id: manageListItemId } });
		} catch (error) {
			this.logger.warn(
				{ id, manageListItemId, err: error },
				'Unable to delete Contact record (may still be referenced)'
			);
		}
	}

	/**
	 * Handles the deletion of additional contacts. Simpler than applicant/agent contacts
	 * because additional contacts are directly linked to the case without an intermediate Organisation.
	 */
	public async deleteAdditionalContact(id: string, manageListItemId: string): Promise<void> {
		await this.db.s62aToApplicant.deleteMany({
			where: {
				s62aId: id,
				contactId: manageListItemId,
				roleId: {
					notIn: [ORGANISATION_ROLES_ID.APPLICANT, ORGANISATION_ROLES_ID.AGENT]
				}
			}
		});

		try {
			await this.db.contact.delete({ where: { id: manageListItemId } });
		} catch (error) {
			this.logger.warn(
				{ id, manageListItemId, err: error },
				'Unable to delete Additional Contact record (may still be referenced)'
			);
		}
	}

	/**
	 * Deletes a vehicle parking entry for the case.
	 */
	public async deleteVehicleParking(id: string, manageListItemId: string): Promise<void> {
		try {
			await this.db.s62aVehicleParking.deleteMany({
				where: { id: manageListItemId, s62aCaseId: id }
			});
		} catch (error) {
			this.logger.warn(
				{ id, manageListItemId, err: error },
				'Unable to delete vehicle parking record (may still be referenced)'
			);
		}
	}

	/**
	 * Deletes a single inspector assignment.
	 */
	public async deleteCaseTeamInspector(id: string, manageListItemId: string): Promise<void> {
		await this.db.s62aCaseInspector.deleteMany({
			where: { id: manageListItemId, s62aCaseId: id }
		});
	}

	/**
	 * Deletes a single waste type entry. The waste type and unit lookups are
	 * reference data and must survive.
	 */
	public async deleteWasteType(id: string, manageListItemId: string): Promise<void> {
		await this.db.s62aCaseWasteType.deleteMany({
			where: { id: manageListItemId, s62aCaseId: id }
		});
	}

	/**
	 * Removes a housing entry. Scoped through the parent so a crafted URL can't
	 * delete another case's row.
	 */
	public async deleteResidentialHousing(s62aCaseId: string, id: string): Promise<void> {
		await this.db.s62aResidentialHousing.deleteMany({
			where: { id, S62aResidential: { s62aCaseId } }
		});
	}
}
