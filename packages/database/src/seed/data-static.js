/**
 * @type {import('@prisma/client').Prisma.ApplicationDecisionOutcomeCreateInput[]}
 */
export const APPLICATION_DECISION_OUTCOME = [
	{
		id: 'approved',
		displayName: 'Approved'
	},
	{
		id: 'approved-with-conditions',
		displayName: 'Approved with conditions'
	},
	{
		id: 'refused',
		displayName: 'Refused'
	},
	{
		id: 'withdrawn',
		displayName: 'Withdrawn'
	}
];

/**
 * @type {import('@prisma/client').Prisma.ApplicationTypeCreateInput[]}
 */
export const APPLICATION_TYPES = [
	{
		id: 'planning-permission',
		displayName: 'Planning permission'
	},
	{
		id: 'outline-planning-permission-some-reserved',
		displayName: 'Outline planning permission with some matters reserved'
	},
	{
		id: 'outline-planning-permission-all-reserved',
		displayName: 'Outline planning permission with all matters reserved'
	},
	{
		id: 'approval-of-reserved-matters',
		displayName: 'Approval of reserved matters following outline approval'
	},
	{
		id: 'planning-permission-and-listed-building-consent',
		displayName:
			'Planning permission and listed building consent for alterations, extension or demolition of a listed building'
	}
];

/**
 * @type {import('@prisma/client').Prisma.ApplicationStatusCreateInput[]}
 */
export const APPLICATION_STATUS = [
	{
		id: 'new',
		displayName: 'New'
	},
	{
		id: 'validation',
		displayName: 'Validation'
	},
	{
		id: 'invalid',
		displayName: 'Invalid'
	},
	{
		id: 'consultation-period-open',
		displayName: 'Consultation period open'
	},
	{
		id: 'event-date-set-decision-awaited',
		displayName: 'Hearing/Inquiry date set: Decision awaited'
	},
	{
		id: 'on-hold',
		displayName: 'Application on hold awaiting further information'
	},
	{
		id: 'report-sent',
		displayName: 'Report sent to Decision Branch'
	},
	{
		id: 'decided',
		displayName: 'Decided'
	},
	{
		id: 'withdrawn',
		displayName: 'Withdrawn'
	},
	{
		id: 'declined-to-determine',
		displayName: 'Declined to determine'
	},
	{
		id: 'closed-invalid',
		displayName: 'Closed - invalid'
	},
	{
		id: 'closed-open-in-error',
		displayName: 'Closed - opened in error'
	}
];

/**
 * @type {import('@prisma/client').Prisma.ApplicationStageCreateInput[]}
 */
export const APPLICATION_STAGE = [
	{
		id: 'acceptance',
		displayName: 'Acceptance'
	},
	{
		id: 'consultation',
		displayName: 'Consultation'
	},
	{
		id: 'procedure-decision',
		displayName: 'Procedure decision'
	},
	{
		id: 'written-representations',
		displayName: 'Written Representations'
	},
	{
		id: 'inquiry',
		displayName: 'Inquiry'
	},
	{
		id: 'hearing',
		displayName: 'Hearing'
	},
	{
		id: 'decision',
		displayName: 'Decision'
	}
];

/**
 * @type {Readonly<{WRITTEN_REPS: string, HEARING: string, INQUIRY: string}>}
 */
export const APPLICATION_PROCEDURE_ID = Object.freeze({
	WRITTEN_REPS: 'written-reps',
	HEARING: 'hearing',
	INQUIRY: 'inquiry'
});

/**
 * @type {import('@prisma/client').Prisma.ApplicationProcedureCreateInput[]}
 */
export const APPLICATION_PROCEDURE = [
	{
		id: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
		displayName: 'Written Representations'
	},
	{
		id: APPLICATION_PROCEDURE_ID.HEARING,
		displayName: 'Hearing'
	},
	{
		id: APPLICATION_PROCEDURE_ID.INQUIRY,
		displayName: 'Inquiry'
	}
];

/**
 * @type {import('@prisma/client').Prisma.RepresentationTypeCreateInput[]}
 */
export const REPRESENTATION_TYPE = [
	{
		id: 'person',
		displayName: 'Person'
	},
	{
		id: 'organisation',
		displayName: 'Organisation'
	},
	{
		id: 'family-group',
		displayName: 'Family Group'
	}
];

// this only works if the main categories are created first
const majorParentConnection = { connect: { id: 'major' } };
const nonMajorParentConnection = { connect: { id: 'non-major' } };

/**
 * @type {import('@prisma/client').Prisma.CategoryCreateInput[]}
 */
export const CATEGORIES = [
	{
		id: 'major',
		displayName: 'Major Development'
	},
	// Major sub categories
	{
		id: 'major-buildings-over-1000-sqm',
		displayName: 'Buildings over 1000 square metres',
		ParentCategory: majorParentConnection
	},
	{
		id: 'major-development-site-1ha-plus',
		displayName: 'Development of a site above 1 hectare',
		ParentCategory: majorParentConnection
	},
	{
		id: 'major-dwellings-10-plus',
		displayName: 'Dwellings numbering 10 or more',
		ParentCategory: majorParentConnection
	},
	{
		id: 'major-dwellings-0.5ha-plus',
		displayName: 'Dwellings of 0.5 hectare or more',
		ParentCategory: majorParentConnection
	},
	{
		id: 'major-minerals',
		displayName: 'Minerals',
		ParentCategory: majorParentConnection
	},
	{
		id: 'major-waste',
		displayName: 'Waste',
		ParentCategory: majorParentConnection
	},
	{
		id: 'major-other',
		displayName: 'Other',
		ParentCategory: majorParentConnection
	},
	{
		id: 'non-major',
		displayName: 'Non-Major Development'
	},
	// Non-Major sub categories
	{
		id: 'non-major-buildings-under-1000-sqm',
		displayName: 'Buildings less than 1000 square metres',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-development-site-1ha-less',
		displayName: 'Development of a site less than 1 hectare',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-dwellings-1-9',
		displayName: 'Dwellings numbering between 1 and 9',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-dwellings-0.5ha-less',
		displayName: 'Dwellings of less than 0.5 hectare',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-change-of-use',
		displayName: 'Change of use',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-relevant-demolition',
		displayName: 'Relevant demolition',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-other',
		displayName: 'Other',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-listed-building-consent-alter',
		displayName: 'Listed building consent to alter/extend',
		ParentCategory: nonMajorParentConnection
	},
	{
		id: 'non-major-listed-building-consent-demolish',
		displayName: 'Listed building consent to demolish',
		ParentCategory: nonMajorParentConnection
	}
];

/**
 * @typedef {import('@prisma/client').Prisma.ApplicationDecisionOutcomeDelegate} ApplicationDecisionOutcomeDelegate
 * @typedef {import('@prisma/client').Prisma.ApplicationTypeDelegate} ApplicationTypeDelegate
 * @typedef {import('@prisma/client').Prisma.ApplicationStageDelegate} ApplicationStageDelegate
 * @typedef {import('@prisma/client').Prisma.ApplicationStatusDelegate} ApplicationStatusDelegate
 * @typedef {import('@prisma/client').Prisma.ApplicationProcedureDelegate} ApplicationProcedureDelegate
 * @typedef {import('@prisma/client').Prisma.RepresentationTypeDelegate} RepresentationTypeDelegate
 * @typedef {import('@prisma/client').Prisma.CategoryDelegate} CategoryDelegate
 */

/**
 * @typedef {import('@prisma/client').Prisma.ApplicationDecisionOutcomeCreateInput} ApplicationDecisionOutcomeCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationTypeCreateInput} ApplicationTypeCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationStageCreateInput} ApplicationStageCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationStatusCreateInput} ApplicationStatusCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationProcedureCreateInput} ApplicationProcedureCreateInput
 * @typedef {import('@prisma/client').Prisma.RepresentationTypeCreateInput} RepresentationTypeCreateInput
 * @typedef {import('@prisma/client').Prisma.CategoryCreateInput} CategoryCreateInput
 */

/**
 * @typedef {{delegate: ApplicationDecisionOutcomeDelegate, input: ApplicationDecisionOutcomeCreateInput}} ApplicationDecisionOutcomeArgs
 * @typedef {{delegate: ApplicationTypeDelegate, input: ApplicationTypeCreateInput}} ApplicationTypeArgs
 * @typedef {{delegate: ApplicationStageDelegate, input: ApplicationStageCreateInput}} ApplicationStageArgs
 * @typedef {{delegate: ApplicationStatusDelegate, input: ApplicationStatusCreateInput}} ApplicationStatusArgs
 * @typedef {{delegate: ApplicationProcedureDelegate, input: ApplicationProcedureCreateInput}} ApplicationProcedureArgs
 * @typedef {{delegate: RepresentationTypeDelegate, input: RepresentationTypeCreateInput}} RepresentationTypeArgs
 * @typedef {{delegate: CategoryDelegate, input: CategoryCreateInput}} CategoryArgs
 */

/**
 * Upsert reference data with any of the given types
 *
 * @param {ApplicationDecisionOutcomeArgs|ApplicationTypeArgs|ApplicationStageArgs|ApplicationStatusArgs|ApplicationProcedureArgs|RepresentationTypeArgs|CategoryArgs} args
 * @returns {Promise<any>}
 */
async function upsertReferenceData({ delegate, input }) {
	return delegate.upsert({
		create: input,
		update: input,
		where: { id: input.id }
	});
}

/**
 * @param {import('@prisma/client').PrismaClient} dbClient
 */
export async function seedStaticData(dbClient) {
	await Promise.all(
		APPLICATION_DECISION_OUTCOME.map((input) =>
			upsertReferenceData({ delegate: dbClient.applicationDecisionOutcome, input })
		)
	);

	await Promise.all(
		APPLICATION_TYPES.map((input) => upsertReferenceData({ delegate: dbClient.applicationType, input }))
	);

	await Promise.all(
		APPLICATION_STATUS.map((input) => upsertReferenceData({ delegate: dbClient.applicationStatus, input }))
	);

	await Promise.all(
		APPLICATION_STAGE.map((input) => upsertReferenceData({ delegate: dbClient.applicationStage, input }))
	);

	await Promise.all(
		APPLICATION_PROCEDURE.map((input) => upsertReferenceData({ delegate: dbClient.applicationProcedure, input }))
	);

	await Promise.all(
		REPRESENTATION_TYPE.map((input) => upsertReferenceData({ delegate: dbClient.representationType, input }))
	);

	const categories = CATEGORIES.filter((c) => !c.ParentCategory);
	const subCategories = CATEGORIES.filter((c) => c.ParentCategory);
	// order is important here - parent categories first
	await Promise.all(categories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));
	await Promise.all(subCategories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));

	console.log('static data seed complete');
}
