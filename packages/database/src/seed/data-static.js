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
 * @type {Readonly<{PLANNING_PERMISSION: string, OUTLINE_PLANNING_SOME_RESERVED: string, OUTLINE_PLANNING_ALL_RESERVED: string, APPROVAL_OF_RESERVED_MATTERS: string, PLANNING_AND_LISTED_BUILDING_CONSENT: string}>}
 */
export const APPLICATION_TYPE_ID = Object.freeze({
	PLANNING_PERMISSION: 'planning-permission',
	OUTLINE_PLANNING_SOME_RESERVED: 'outline-planning-permission-some-reserved',
	OUTLINE_PLANNING_ALL_RESERVED: 'outline-planning-permission-all-reserved',
	APPROVAL_OF_RESERVED_MATTERS: 'approval-of-reserved-matters',
	PLANNING_AND_LISTED_BUILDING_CONSENT: 'planning-permission-and-listed-building-consent'
});

/**
 * @type {import('@prisma/client').Prisma.ApplicationTypeCreateInput[]}
 */
export const APPLICATION_TYPES = [
	{
		id: APPLICATION_TYPE_ID.PLANNING_PERMISSION,
		displayName: 'Planning permission'
	},
	{
		id: APPLICATION_TYPE_ID.OUTLINE_PLANNING_SOME_RESERVED,
		displayName: 'Outline planning permission with some matters reserved'
	},
	{
		id: APPLICATION_TYPE_ID.OUTLINE_PLANNING_ALL_RESERVED,
		displayName: 'Outline planning permission with all matters reserved'
	},
	{
		id: APPLICATION_TYPE_ID.APPROVAL_OF_RESERVED_MATTERS,
		displayName: 'Approval of reserved matters following outline approval'
	},
	{
		id: APPLICATION_TYPE_ID.PLANNING_AND_LISTED_BUILDING_CONSENT,
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
		id: 'acceptance',
		// called complete to match the terminology in the draft order
		displayName: 'Complete'
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
		id: 'event-date-set',
		displayName: 'Hearing/Inquiry date set'
	},
	{
		id: 'on-hold',
		displayName: 'Application on hold awaiting further information'
	},
	{
		id: 'report-awaited',
		displayName: 'Report awaited'
	},
	{
		id: 'report-sent',
		displayName: 'Report sent to Decision Branch'
	},
	{
		id: 'decision-awaited',
		displayName: 'Decision awaited'
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
		// called complete to match the terminology in the draft order
		displayName: 'Complete'
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
 * @type {import('@prisma/client').Prisma.RepresentationCategoryCreateInput[]}
 */
export const REPRESENTATION_CATEGORY = [
	{
		id: 'public',
		displayName: 'Member of the public'
	},
	{
		id: 'non-stat-organisation',
		displayName: 'Non-statutory organisations'
	},
	{
		id: 'other-stat-con',
		displayName: 'Other statutory consultee'
	},
	{
		id: 'parish-council',
		displayName: 'Parish Council'
	}
];

/**
 * @type {Readonly<{MYSELF: string, ON_BEHALF_OF: string}>}
 */
export const REPRESENTATION_SUBMITTED_FOR_ID = Object.freeze({
	MYSELF: 'myself',
	ON_BEHALF_OF: 'on-behalf-of'
});

/**
 * @type {import('@prisma/client').Prisma.RepresentationSubmittedForCreateInput[]}
 */
export const REPRESENTATION_SUBMITTED_FOR = [
	{
		id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
		displayName: 'Myself'
	},
	{
		id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
		displayName: 'On behalf of another person or an organisation'
	}
];

/**
 * @type {Readonly<{AWAITING_REVIEW: string, ACCEPTED: string, REJECTED: string}>}
 */
export const REPRESENTATION_STATUS_ID = Object.freeze({
	AWAITING_REVIEW: 'awaiting-review',
	ACCEPTED: 'accepted',
	REJECTED: 'rejected'
});

/**
 * @type {import('@prisma/client').Prisma.RepresentationStatusCreateInput[]}
 */
export const REPRESENTATION_STATUS = [
	{
		id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
		displayName: 'Awaiting Review'
	},
	{
		id: REPRESENTATION_STATUS_ID.ACCEPTED,
		displayName: 'Accepted'
	},
	{
		id: REPRESENTATION_STATUS_ID.REJECTED,
		displayName: 'Rejected'
	}
];

/**
 * @type {Readonly<{PERSON: string, ORGANISATION: string, ORG_NOT_WORK_FOR: string}>}
 */
export const REPRESENTED_TYPE_ID = Object.freeze({
	PERSON: 'person',
	ORGANISATION: 'organisation',
	ORG_NOT_WORK_FOR: 'household'
});

/**
 * @type {import('@prisma/client').Prisma.RepresentedTypeCreateInput[]}
 */
export const REPRESENTED_TYPE = [
	{
		id: REPRESENTED_TYPE_ID.PERSON,
		displayName: 'A person'
	},
	{
		id: REPRESENTED_TYPE_ID.ORGANISATION,
		displayName: 'An organisation or charity I work or volunteer for'
	},
	{
		id: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
		displayName: 'An organisation or charity I do not work or volunteer for'
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
 * @typedef {import('@prisma/client').Prisma.RepresentationCategoryDelegate} RepresentationCategoryDelegate
 * @typedef {import('@prisma/client').Prisma.RepresentationSubmittedForDelegate} RepresentationSubmittedForDelegate
 * @typedef {import('@prisma/client').Prisma.RepresentationStatusDelegate} RepresentationStatusDelegate
 * @typedef {import('@prisma/client').Prisma.RepresentedTypeDelegate} RepresentedTypeDelegate
 * @typedef {import('@prisma/client').Prisma.CategoryDelegate} CategoryDelegate
 */

/**
 * @typedef {import('@prisma/client').Prisma.ApplicationDecisionOutcomeCreateInput} ApplicationDecisionOutcomeCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationTypeCreateInput} ApplicationTypeCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationStageCreateInput} ApplicationStageCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationStatusCreateInput} ApplicationStatusCreateInput
 * @typedef {import('@prisma/client').Prisma.ApplicationProcedureCreateInput} ApplicationProcedureCreateInput
 * @typedef {import('@prisma/client').Prisma.RepresentationCategoryCreateInput} RepresentationCategoryCreateInput
 * @typedef {import('@prisma/client').Prisma.RepresentationSubmittedForCreateInput} RepresentationSubmittedForCreateInput
 * @typedef {import('@prisma/client').Prisma.RepresentationStatusCreateInput} RepresentationStatusCreateInput
 * @typedef {import('@prisma/client').Prisma.RepresentedTypeCreateInput} RepresentedTypeCreateInput
 * @typedef {import('@prisma/client').Prisma.CategoryCreateInput} CategoryCreateInput
 */

/**
 * @typedef {{delegate: ApplicationDecisionOutcomeDelegate, input: ApplicationDecisionOutcomeCreateInput}} ApplicationDecisionOutcomeArgs
 * @typedef {{delegate: ApplicationTypeDelegate, input: ApplicationTypeCreateInput}} ApplicationTypeArgs
 * @typedef {{delegate: ApplicationStageDelegate, input: ApplicationStageCreateInput}} ApplicationStageArgs
 * @typedef {{delegate: ApplicationStatusDelegate, input: ApplicationStatusCreateInput}} ApplicationStatusArgs
 * @typedef {{delegate: ApplicationProcedureDelegate, input: ApplicationProcedureCreateInput}} ApplicationProcedureArgs
 * @typedef {{delegate: RepresentationCategoryDelegate, input: RepresentationCategoryCreateInput}} RepresentationCategoryArgs
 * @typedef {{delegate: RepresentationSubmittedForDelegate, input: RepresentationSubmittedForCreateInput}} RepresentationSubmittedForArgs
 * @typedef {{delegate: RepresentationStatusDelegate, input: RepresentationStatusCreateInput}} RepresentationStatusArgs
 * @typedef {{delegate: RepresentedTypeDelegate, input: RepresentedTypeCreateInput}} RepresentedTypeArgs
 * @typedef {{delegate: CategoryDelegate, input: CategoryCreateInput}} CategoryArgs
 */

/**
 * Upsert reference data with any of the given types
 *
 * @param {ApplicationDecisionOutcomeArgs|ApplicationTypeArgs|ApplicationStageArgs|ApplicationStatusArgs|ApplicationProcedureArgs|RepresentationCategoryArgs|RepresentationSubmittedForArgs|RepresentationStatusArgs|RepresentedTypeArgs|CategoryArgs} args
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
		REPRESENTATION_CATEGORY.map((input) => upsertReferenceData({ delegate: dbClient.representationCategory, input }))
	);

	await Promise.all(
		REPRESENTATION_STATUS.map((input) => upsertReferenceData({ delegate: dbClient.representationStatus, input }))
	);

	await Promise.all(
		REPRESENTATION_SUBMITTED_FOR.map((input) =>
			upsertReferenceData({ delegate: dbClient.representationSubmittedFor, input })
		)
	);

	await Promise.all(
		REPRESENTED_TYPE.map((input) => upsertReferenceData({ delegate: dbClient.representedType, input }))
	);

	const categories = CATEGORIES.filter((c) => !c.ParentCategory);
	const subCategories = CATEGORIES.filter((c) => c.ParentCategory);
	// order is important here - parent categories first
	await Promise.all(categories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));
	await Promise.all(subCategories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));

	console.log('static data seed complete');
}
