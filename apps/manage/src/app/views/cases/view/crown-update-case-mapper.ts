import { APPLICATION_PROCEDURE_ID, APPLICATION_STAGE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { toIntOrNull } from '@pins/crowndev-lib/util/numbers.ts';
import { optionalWhere } from '@planning-inspectorate/core/util';
import { viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
import { assignOptionalRelation, assignRepresentationsPeriod } from '@pins/crowndev-lib/util/shared-case-updates.ts';
import {
	buildAgentOrganisationNameUpdates,
	buildAgentOrganisationAddressUpdates,
	buildApplicantOrganisationUpdates,
	buildApplicantContactOrganisationUpdates,
	buildAgentContactOrganisationUpdates
} from './linked-case-updates.ts';
import {
	assignDirectUpdate,
	DECIMAL_FIELDS,
	DIRECT_UPDATE_FIELDS,
	NON_UPDATABLE_FIELDS,
	hasProcedure,
	stageIsProcedure,
	viewModelToEventUpdateInput
} from './view-model.ts';
import type { CrownDevelopmentSaveModel, CrownDevelopmentViewModel } from './view-model.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export interface CrownCaseUpdateMapperOptions {
	includeOrganisations?: boolean;
}

/**
 * Class that handles mapping a Crown development update request into the correct
 * form for a DB interaction.
 *
 * Mirrors the structure of `S62aCaseUpdateMapper`, splitting the mapping into
 * private methods per logical section (direct fields, relations, site address,
 * organisations, procedure/event, secondary LPA clearing).
 */
export class CrownCaseUpdateMapper {
	private edits: CrownDevelopmentSaveModel;
	private viewModel: CrownDevelopmentViewModel;
	private includeOrganisations: boolean;

	constructor(
		edits: CrownDevelopmentSaveModel,
		viewModel: CrownDevelopmentViewModel,
		options: CrownCaseUpdateMapperOptions = {}
	) {
		this.edits = edits;
		this.viewModel = viewModel;
		this.includeOrganisations = options?.includeOrganisations !== false;
	}

	/**
	 * Builds and returns the Prisma `CrownDevelopmentUpdateInput` for the edits/view model
	 * supplied to the constructor.
	 */
	public generateUpdateInput(): Prisma.CrownDevelopmentUpdateInput {
		const updateInput: Prisma.CrownDevelopmentUpdateInput = {};

		this.mapDirectFields(updateInput);
		this.mapRelations(updateInput);
		this.mapSiteAddress(updateInput);
		this.mapOrganisations(updateInput);
		this.mapProcedureAndEvent(updateInput);
		this.mapSecondaryLpaClearing(updateInput);

		return updateInput;
	}

	/**
	 * Handles the regular/scalar fields, decimal coercion, number-as-string
	 * fields, and the representations period.
	 */
	private mapDirectFields(updateInput: Prisma.CrownDevelopmentUpdateInput): void {
		const edits = this.edits;

		// map all the regular fields to the update input
		// Boolean fields do not need to be converted from YesNo here since they are already true booleans in the edits
		for (const field of DIRECT_UPDATE_FIELDS) {
			assignDirectUpdate(updateInput, edits, field);
		}

		// don't support updating these fields
		NON_UPDATABLE_FIELDS.forEach((field) => {
			delete updateInput[field];
		});

		// Coerce empty strings to null for decimal fields – Prisma cannot parse "" as Decimal
		for (const field of DECIMAL_FIELDS) {
			if (field in updateInput && updateInput[field] === '') {
				updateInput[field] = null;
			}
		}

		// set number-as-string fields
		// Uses toIntOrNull (not a truthy check) so a real value of 0 isn't wrongly nulled out.
		if ('siteNorthing' in edits || 'siteEasting' in edits) {
			updateInput.siteNorthing = toIntOrNull(edits.siteNorthing);
			updateInput.siteEasting = toIntOrNull(edits.siteEasting);
		}

		if (edits.representationsPeriod) {
			assignRepresentationsPeriod(updateInput, edits.representationsPeriod);
		}
	}

	/**
	 * Handles required and optional foreign key scalar fields that need to be
	 * mapped to relations for a consistent return type.
	 */
	private mapRelations(updateInput: Prisma.CrownDevelopmentUpdateInput): void {
		const edits = this.edits;

		// Required foreign key scalar fields need to be mapped to relations for a consistent return type.
		if ('typeId' in edits && edits.typeId) {
			updateInput.Type = { connect: { id: edits.typeId } };
		}
		if ('lpaId' in edits && edits.lpaId) {
			updateInput.Lpa = { connect: { id: edits.lpaId } };
		}

		// Optional foreign key scalar fields need to be mapped to relations for a consistent return type.
		assignOptionalRelation(updateInput, 'DecisionOutcome', 'decisionOutcomeId' in edits, edits.decisionOutcomeId);
		assignOptionalRelation(updateInput, 'Status', 'statusId' in edits, edits.statusId);
		// stageId edited directly (may be overridden below by procedure block)
		assignOptionalRelation(updateInput, 'Stage', 'stageId' in edits, edits.stageId);
		if ('secondaryLpaId' in edits && edits.secondaryLpaId) {
			updateInput.SecondaryLpa = { connect: { id: edits.secondaryLpaId } };
		}

		if (edits.subCategoryId) {
			updateInput.Category = {
				connect: { id: edits.subCategoryId }
			};
		}
	}

	/**
	 * Handles the site address upsert.
	 */
	private mapSiteAddress(updateInput: Prisma.CrownDevelopmentUpdateInput): void {
		const edits = this.edits;

		if ('siteAddress' in edits && edits.siteAddress) {
			const siteAddress = viewModelToAddressUpdateInput(edits.siteAddress);
			if (siteAddress) {
				updateInput.SiteAddress = {
					upsert: {
						where: optionalWhere(this.viewModel.siteAddressId),
						create: siteAddress,
						update: siteAddress
					}
				};
			}
		}
	}

	/**
	 * Handles applicant/agent organisation and contact updates, gated by
	 * `includeOrganisations`.
	 */
	private mapOrganisations(updateInput: Prisma.CrownDevelopmentUpdateInput): void {
		if (!this.includeOrganisations) {
			return;
		}

		const edits = this.edits;
		const viewModel = this.viewModel;

		if ('manageApplicantDetails' in edits) {
			updateInput.Organisations = buildApplicantOrganisationUpdates(edits, viewModel);
		}

		// Applicant contacts linked to organisations
		if ('manageApplicantContactDetails' in edits) {
			updateInput.Organisations = buildApplicantContactOrganisationUpdates(edits, viewModel);
		}

		// Agent contacts linked to organisations
		if ('manageAgentContactDetails' in edits) {
			updateInput.Organisations = buildAgentContactOrganisationUpdates(edits, viewModel);
		}

		const agentOrganisationNameUpdates = buildAgentOrganisationNameUpdates(edits, viewModel);
		if (agentOrganisationNameUpdates) {
			updateInput.Organisations = agentOrganisationNameUpdates;
		}

		const agentOrganisationAddressUpdates = buildAgentOrganisationAddressUpdates(edits, viewModel);
		if (agentOrganisationAddressUpdates) {
			updateInput.Organisations = agentOrganisationAddressUpdates;
		}
	}

	/**
	 * Handles procedure changes (including event deletion/stage updates) and
	 * the event upsert for the current procedure.
	 */
	private mapProcedureAndEvent(updateInput: Prisma.CrownDevelopmentUpdateInput): void {
		const edits = this.edits;
		const viewModel = this.viewModel;

		if ('procedureId' in edits && edits.procedureId !== viewModel.procedureId) {
			if (edits.procedureId) {
				updateInput.Procedure = {
					connect: { id: edits.procedureId }
				};
				if (stageIsProcedure(viewModel.stageId)) {
					// If the current stage is a procedure, update it to match the new procedure
					updateInput.Stage = {
						connect: {
							id:
								edits.procedureId === APPLICATION_PROCEDURE_ID.WRITTEN_REPS
									? APPLICATION_STAGE_ID.WRITTEN_REPRESENTATIONS
									: edits.procedureId
						}
					};
				}
			} else {
				// Added to handle the case where a procedure is removed (set to null)
				updateInput.Procedure = {
					disconnect: true
				};
				if (stageIsProcedure(viewModel.stageId)) {
					updateInput.Stage = {
						connect: { id: APPLICATION_STAGE_ID.PROCEDURE_DECISION }
					};
				}
			}
			updateInput.procedureNotificationDate = null;
			if (viewModel.eventId) {
				// delete existing event if procedure changed and there is an existing event
				updateInput.Event = {
					delete: true
				};
			}
		}
		if (hasProcedure(viewModel.procedureId)) {
			const eventUpdates = viewModelToEventUpdateInput(edits, viewModel.procedureId);

			if (eventUpdates.eventUpdateInput && Object.keys(eventUpdates.eventUpdateInput).length > 0) {
				updateInput.Event = {
					upsert: {
						where: optionalWhere(viewModel.eventId),
						create: eventUpdates.eventUpdateInput as Prisma.EventCreateWithoutCrownDevelopmentInput,
						update: eventUpdates.eventUpdateInput
					}
				};
			}
			if (eventUpdates.procedureNotificationDate) {
				updateInput.procedureNotificationDate = eventUpdates.procedureNotificationDate;
			}
		}
	}

	/**
	 * If you select no for hasSecondaryLpa then it should remove the secondaryLpa answers,
	 * and if you remove the secondaryLpa then it should set hasSecondaryLpa to false.
	 */
	private mapSecondaryLpaClearing(updateInput: Prisma.CrownDevelopmentUpdateInput): void {
		const edits = this.edits;

		if (
			('hasSecondaryLpa' in edits && edits.hasSecondaryLpa === false) ||
			('secondaryLpaId' in edits && edits.secondaryLpaId === null)
		) {
			updateInput.hasSecondaryLpa = false;
			updateInput.SecondaryLpa = { disconnect: true };
		}
	}
}
