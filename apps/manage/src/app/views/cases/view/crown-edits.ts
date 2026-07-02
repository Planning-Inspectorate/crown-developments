import { APPLICATION_PROCEDURE_ID, APPLICATION_STAGE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { toInt } from '@pins/crowndev-lib/util/numbers.ts';
import { optionalWhere } from '@pins/crowndev-lib/util/database.ts';
import { viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
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
import type { ApplyCaseTypeUpdates } from './view-model.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

/**
 * Crown-specific mapping of edits to a CrownDevelopment update input.
 *
 * Mutates `updateInput` in place; returns void.
 */
export const crownEditsToDatabaseUpdates: ApplyCaseTypeUpdates = (updateInput, edits, viewModel, options) => {
	const includeOrganisations = options?.includeOrganisations !== false;

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
	if ('siteNorthing' in edits || 'siteEasting' in edits) {
		updateInput.siteNorthing = edits.siteNorthing ? toInt(edits.siteNorthing) : null;
		updateInput.siteEasting = edits.siteEasting ? toInt(edits.siteEasting) : null;
	}

	if (edits.representationsPeriod) {
		updateInput.representationsPeriodStartDate = edits.representationsPeriod.start;
		updateInput.representationsPeriodEndDate = edits.representationsPeriod.end;
	}

	// update relations

	// Required foreign key scalar fields need to be mapped to relations for a consistent return type.
	if ('typeId' in edits && edits.typeId) {
		updateInput.Type = { connect: { id: edits.typeId } };
	}
	if ('lpaId' in edits && edits.lpaId) {
		updateInput.Lpa = { connect: { id: edits.lpaId } };
	}

	// Optional foreign key scalar fields need to be mapped to relations for a consistent return type.
	if ('decisionOutcomeId' in edits) {
		updateInput.DecisionOutcome = edits.decisionOutcomeId
			? { connect: { id: edits.decisionOutcomeId } }
			: { disconnect: true };
	}
	if ('statusId' in edits) {
		updateInput.Status = edits.statusId ? { connect: { id: edits.statusId } } : { disconnect: true };
	}
	// stageId edited directly (may be overridden below by procedure block)
	if ('stageId' in edits) {
		updateInput.Stage = edits.stageId ? { connect: { id: edits.stageId } } : { disconnect: true };
	}
	if ('secondaryLpaId' in edits && edits.secondaryLpaId) {
		updateInput.SecondaryLpa = { connect: { id: edits.secondaryLpaId } };
	}

	if (edits.subCategoryId) {
		updateInput.Category = {
			connect: { id: edits.subCategoryId }
		};
	}

	if ('siteAddress' in edits && edits.siteAddress) {
		const siteAddress = viewModelToAddressUpdateInput(edits.siteAddress);
		if (siteAddress) {
			updateInput.SiteAddress = {
				upsert: {
					where: optionalWhere(viewModel.siteAddressId),
					create: siteAddress,
					update: siteAddress
				}
			};
		}
	}

	if (includeOrganisations) {
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

	// If you select no for hasSecondaryLpa then it should remove the secondaryLpa answers,
	// and if you remove the secondaryLpa then it should set hasSecondaryLpa to false
	if (
		('hasSecondaryLpa' in edits && edits.hasSecondaryLpa === false) ||
		('secondaryLpaId' in edits && edits.secondaryLpaId === null)
	) {
		updateInput.hasSecondaryLpa = false;
		updateInput.SecondaryLpa = { disconnect: true };
	}
};
