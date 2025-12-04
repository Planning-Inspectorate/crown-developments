/**
 * @type {import('@pins/crowndev-database').Prisma.ApplicationDecisionOutcomeCreateInput[]}
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
 * @type {import('@pins/crowndev-database').Prisma.ApplicationTypeCreateInput[]}
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
			'Planning permission and listed building consent (LBC) for alterations, extension or demolition of a listed building'
	}
];

/**
 * @type {Readonly<{PLANNING_PERMISSION: string, LISTED_BUILDING_CONSENT: string}>}
 */
export const APPLICATION_SUB_TYPE_ID = Object.freeze({
	PLANNING_PERMISSION: 'planning-permission',
	LISTED_BUILDING_CONSENT: 'listed-building-consent'
});

/**
 * @type {import('@pins/crowndev-database').Prisma.ApplicationSubTypeCreateInput[]}
 */
export const APPLICATION_SUB_TYPES = [
	{
		id: APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION,
		displayName: 'Planning permission'
	},
	{
		id: APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT,
		displayName: 'Listed building consent (LBC)'
	}
];

/**
 * @type {import('@pins/crowndev-database').Prisma.ApplicationStatusCreateInput[]}
 */
export const APPLICATION_STATUS = [
	{
		id: 'new',
		displayName: 'New'
	},
	{
		id: 'acceptance',
		// called complete to match the terminology in the draft order
		displayName: 'Accepted'
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

export const APPLICATION_STAGE_ID = Object.freeze({
	ACCEPTANCE: 'acceptance',
	CONSULTATION: 'consultation',
	PROCEDURE_DECISION: 'procedure-decision',
	WRITTEN_REPRESENTATIONS: 'written-representations',
	INQUIRY: 'inquiry',
	HEARING: 'hearing',
	DECISION: 'decision'
});

/**
 * @type {import('@pins/crowndev-database').Prisma.ApplicationStageCreateInput[]}
 */
export const APPLICATION_STAGE = [
	{
		id: APPLICATION_STAGE_ID.ACCEPTANCE,
		// called complete to match the terminology in the draft order
		displayName: 'Accepted'
	},
	{
		id: APPLICATION_STAGE_ID.CONSULTATION,
		displayName: 'Consultation'
	},
	{
		id: APPLICATION_STAGE_ID.PROCEDURE_DECISION,
		displayName: 'Procedure choice'
	},
	{
		id: APPLICATION_STAGE_ID.WRITTEN_REPRESENTATIONS,
		displayName: 'Written representations'
	},
	{
		id: APPLICATION_STAGE_ID.INQUIRY,
		displayName: 'Inquiry'
	},
	{
		id: APPLICATION_STAGE_ID.HEARING,
		displayName: 'Hearing'
	},
	{
		id: APPLICATION_STAGE_ID.DECISION,
		displayName: 'Final decision'
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
 * @type {import('@pins/crowndev-database').Prisma.ApplicationProcedureCreateInput[]}
 */
export const APPLICATION_PROCEDURE = [
	{
		id: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
		displayName: 'Written representations'
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
 * @type {Readonly<{DRAFT: string, PUBLISHED: string, UNPUBLISHED: string}>}
 */
export const APPLICATION_UPDATE_STATUS_ID = Object.freeze({
	DRAFT: 'draft',
	PUBLISHED: 'published',
	UNPUBLISHED: 'unpublished'
});

/**
 * @type {import('@pins/crowndev-database').Prisma.ApplicationUpdateStatusCreateInput[]}
 */
export const APPLICATION_UPDATE_STATUS = [
	{
		id: APPLICATION_UPDATE_STATUS_ID.DRAFT,
		displayName: 'Draft'
	},
	{
		id: APPLICATION_UPDATE_STATUS_ID.PUBLISHED,
		displayName: 'Published'
	},
	{
		id: APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED,
		displayName: 'Unpublished'
	}
];

/**
 * @type {Readonly<{SENDING: string, DELIVERED: string, PERMANENT_FAILURE: string, TEMPORARY_FAILURE: string, TECHNICAL_FAILURE: string}>}
 */
export const NOTIFY_STATUS_ID = Object.freeze({
	SENDING: 'sending',
	DELIVERED: 'delivered',
	PERMANENT_FAILURE: 'permanent-failure',
	TEMPORARY_FAILURE: 'temporary-failure',
	TECHNICAL_FAILURE: 'technical-failure'
});

/**
 *
 * @type {import('@pins/crowndev-database').Prisma.NotifyStatusCreateInput[]}
 */
export const NOTIFY_STATUS = [
	{
		id: NOTIFY_STATUS_ID.SENDING,
		displayName: 'Sending'
	},
	{
		id: NOTIFY_STATUS_ID.DELIVERED,
		displayName: 'Delivered'
	},
	{
		id: NOTIFY_STATUS_ID.PERMANENT_FAILURE,
		displayName: 'Permanent failure'
	},
	{
		id: NOTIFY_STATUS_ID.TEMPORARY_FAILURE,
		displayName: 'Temporary failure'
	},
	{
		id: NOTIFY_STATUS_ID.TECHNICAL_FAILURE,
		displayName: 'Technical failure'
	}
];

export const NOTIFICATION_SOURCE = Object.freeze({
	REPRESENTATION: 'representation',
	APPLICATION: 'application'
});

/**
 *
 * @type {Readonly<{CONSULTEES: string, INTERESTED_PARTIES: string}>}
 */
export const REPRESENTATION_CATEGORY_ID = Object.freeze({
	CONSULTEES: 'consultees',
	INTERESTED_PARTIES: 'interested-parties'
});
/**
 * @type {import('@pins/crowndev-database').Prisma.RepresentationCategoryCreateInput[]}
 */
export const REPRESENTATION_CATEGORY = [
	{
		id: 'consultees',
		displayName: 'Consultees'
	},
	{
		id: 'interested-parties',
		displayName: 'Interested Party'
	}
];
/**
 * @type {Readonly<{EMAIL: string, POST: string}>}
 */
export const CONTACT_PREFERENCE_ID = Object.freeze({
	EMAIL: 'email',
	POST: 'post'
});
/**
 * @type {import('@pins/crowndev-database').Prisma.ContactPreferenceCreateInput[]}
 */
export const CONTACT_PREFERENCE = [
	{
		id: CONTACT_PREFERENCE_ID.EMAIL,
		displayName: 'Email'
	},
	{
		id: CONTACT_PREFERENCE_ID.POST,
		displayName: 'Post'
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
 * @type {import('@pins/crowndev-database').Prisma.RepresentationSubmittedForCreateInput[]}
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
	REJECTED: 'rejected',
	WITHDRAWN: 'withdrawn'
});

/**
 * @type {import('@pins/crowndev-database').Prisma.RepresentationStatusCreateInput[]}
 */
export const REPRESENTATION_STATUS = [
	{
		id: REPRESENTATION_STATUS_ID.AWAITING_REVIEW,
		displayName: 'Awaiting review'
	},
	{
		id: REPRESENTATION_STATUS_ID.ACCEPTED,
		displayName: 'Accepted'
	},
	{
		id: REPRESENTATION_STATUS_ID.REJECTED,
		displayName: 'Rejected'
	},
	{
		id: REPRESENTATION_STATUS_ID.WITHDRAWN,
		displayName: 'Withdrawn'
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
 * @type {import('@pins/crowndev-database').Prisma.RepresentedTypeCreateInput[]}
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

/**
 * @type {Readonly<{CHANGE_OF_OPINION: string, MISTAKEN_SUBMISSION: string, MISUNDERSTANDING: string, PERSONAL_REASONS: string}>}
 */
export const WITHDRAWAL_REASON_ID = Object.freeze({
	CHANGE_OF_OPINION: 'change-of-opinion',
	MISTAKEN_SUBMISSION: 'mistaken-submission',
	MISUNDERSTANDING: 'misunderstanding',
	PERSONAL_REASONS: 'personal-reasons'
});

/**
 * @type {import('@pins/crowndev-database').Prisma.WithdrawalReasonCreateInput[]}
 */
export const WITHDRAWAL_REASON = [
	{
		id: WITHDRAWAL_REASON_ID.CHANGE_OF_OPINION,
		displayName: 'Change of opinion',
		hintText: 'They no longer feel the same way about the application'
	},
	{
		id: WITHDRAWAL_REASON_ID.MISTAKEN_SUBMISSION,
		displayName: 'Mistaken Submission',
		hintText: 'They accidentally submitted the representation'
	},
	{
		id: WITHDRAWAL_REASON_ID.MISUNDERSTANDING,
		displayName: 'Misunderstanding',
		hintText: 'They misunderstood the application or its implications'
	},
	{
		id: WITHDRAWAL_REASON_ID.PERSONAL_REASONS,
		displayName: 'Personal Reasons',
		hintText: 'Such as privacy or a change in circumstances'
	}
];

// this only works if the main categories are created first
const majorParentConnection = { connect: { id: 'major' } };
const nonMajorParentConnection = { connect: { id: 'non-major' } };

/**
 * @type {import('@pins/crowndev-database').Prisma.CategoryCreateInput[]}
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
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationDecisionOutcomeDelegate} ApplicationDecisionOutcomeDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationTypeDelegate} ApplicationTypeDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationStageDelegate} ApplicationStageDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationStatusDelegate} ApplicationStatusDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationProcedureDelegate} ApplicationProcedureDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentationCategoryDelegate} RepresentationCategoryDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentationSubmittedForDelegate} RepresentationSubmittedForDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentationStatusDelegate} RepresentationStatusDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentedTypeDelegate} RepresentedTypeDelegate
 * @typedef {import('@pins/crowndev-database').Prisma.CategoryDelegate} CategoryDelegate
 */

/**
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationDecisionOutcomeCreateInput} ApplicationDecisionOutcomeCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationTypeCreateInput} ApplicationTypeCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationStageCreateInput} ApplicationStageCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationStatusCreateInput} ApplicationStatusCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.ApplicationProcedureCreateInput} ApplicationProcedureCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentationCategoryCreateInput} RepresentationCategoryCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentationSubmittedForCreateInput} RepresentationSubmittedForCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentationStatusCreateInput} RepresentationStatusCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.RepresentedTypeCreateInput} RepresentedTypeCreateInput
 * @typedef {import('@pins/crowndev-database').Prisma.CategoryCreateInput} CategoryCreateInput
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
 * @param {import('@pins/crowndev-database').PrismaClient} dbClient
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
		APPLICATION_SUB_TYPES.map((input) => upsertReferenceData({ delegate: dbClient.applicationSubType, input }))
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
		APPLICATION_UPDATE_STATUS.map((input) => upsertReferenceData({ delegate: dbClient.applicationUpdateStatus, input }))
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

	await Promise.all(
		CONTACT_PREFERENCE.map((input) => upsertReferenceData({ delegate: dbClient.contactPreference, input }))
	);
	await Promise.all(NOTIFY_STATUS.map((input) => upsertReferenceData({ delegate: dbClient.notifyStatus, input })));

	await Promise.all(
		WITHDRAWAL_REASON.map((input) => upsertReferenceData({ delegate: dbClient.withdrawalReason, input }))
	);

	const categories = CATEGORIES.filter((c) => !c.ParentCategory);
	const subCategories = CATEGORIES.filter((c) => c.ParentCategory);
	// order is important here - parent categories first
	await Promise.all(categories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));
	await Promise.all(subCategories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));

	console.log('static data seed complete');
}
