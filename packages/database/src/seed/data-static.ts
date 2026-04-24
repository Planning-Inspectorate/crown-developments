import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';

export const APPLICATION_DECISION_OUTCOME: Prisma.ApplicationDecisionOutcomeCreateInput[] = [
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

export const APPLICATION_TYPE_ID = Object.freeze({
	PLANNING_PERMISSION: 'planning-permission',
	OUTLINE_PLANNING_SOME_RESERVED: 'outline-planning-permission-some-reserved',
	OUTLINE_PLANNING_ALL_RESERVED: 'outline-planning-permission-all-reserved',
	APPROVAL_OF_RESERVED_MATTERS: 'approval-of-reserved-matters',
	PLANNING_AND_LISTED_BUILDING_CONSENT: 'planning-permission-and-listed-building-consent'
} as const);

export const APPLICATION_TYPES: Prisma.ApplicationTypeCreateInput[] = [
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

export const APPLICATION_SUB_TYPE_ID = Object.freeze({
	PLANNING_PERMISSION: 'planning-permission',
	LISTED_BUILDING_CONSENT: 'listed-building-consent'
} as const);

export const APPLICATION_SUB_TYPES: Prisma.ApplicationSubTypeCreateInput[] = [
	{
		id: APPLICATION_SUB_TYPE_ID.PLANNING_PERMISSION,
		displayName: 'Planning permission'
	},
	{
		id: APPLICATION_SUB_TYPE_ID.LISTED_BUILDING_CONSENT,
		displayName: 'Listed building consent (LBC)'
	}
];
export const ORGANISATION_ROLES_ID = Object.freeze({
	APPLICANT: 'applicant',
	AGENT: 'agent'
} as const);

export const ORGANISATION_ROLES: Prisma.CrownDevelopmentToOrganisationRoleCreateInput[] = [
	{
		id: ORGANISATION_ROLES_ID.APPLICANT,
		displayName: 'Applicant'
	},
	{
		id: ORGANISATION_ROLES_ID.AGENT,
		displayName: 'Agent'
	}
];

export const APPLICATION_STATUS: Prisma.ApplicationStatusCreateInput[] = [
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
} as const);

export const APPLICATION_STAGE: Prisma.ApplicationStageCreateInput[] = [
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

export const APPLICATION_PROCEDURE_ID = Object.freeze({
	WRITTEN_REPS: 'written-reps',
	HEARING: 'hearing',
	INQUIRY: 'inquiry'
} as const);

export const APPLICATION_PROCEDURE: Prisma.ApplicationProcedureCreateInput[] = [
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

export const APPLICATION_UPDATE_STATUS_ID = Object.freeze({
	DRAFT: 'draft',
	PUBLISHED: 'published',
	UNPUBLISHED: 'unpublished'
} as const);

export const APPLICATION_UPDATE_STATUS: Prisma.ApplicationUpdateStatusCreateInput[] = [
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

export const NOTIFY_STATUS_ID = Object.freeze({
	SENDING: 'sending',
	DELIVERED: 'delivered',
	PERMANENT_FAILURE: 'permanent-failure',
	TEMPORARY_FAILURE: 'temporary-failure',
	TECHNICAL_FAILURE: 'technical-failure'
} as const);

export const NOTIFY_STATUS: Prisma.NotifyStatusCreateInput[] = [
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
} as const);

export const RECEIVED_METHOD_ID = Object.freeze({
	ONLINE: 'online',
	PHONE: 'phone',
	EMAIL: 'email',
	POST: 'post',
	IN_PERSON: 'in-person'
} as const);

export const RECEIVED_METHOD: Prisma.RepresentationReceivedMethodCreateInput[] = [
	{ id: RECEIVED_METHOD_ID.ONLINE, displayName: 'Online' },
	{ id: RECEIVED_METHOD_ID.PHONE, displayName: 'Phone' },
	{ id: RECEIVED_METHOD_ID.EMAIL, displayName: 'Email' },
	{ id: RECEIVED_METHOD_ID.POST, displayName: 'Post' },
	{ id: RECEIVED_METHOD_ID.IN_PERSON, displayName: 'In person' }
];

export const REPRESENTATION_CATEGORY_ID = Object.freeze({
	CONSULTEES: 'consultees',
	INTERESTED_PARTIES: 'interested-parties'
} as const);

export const REPRESENTATION_CATEGORY: Prisma.RepresentationCategoryCreateInput[] = [
	{
		id: 'consultees',
		displayName: 'Consultees'
	},
	{
		id: 'interested-parties',
		displayName: 'Interested party'
	}
];

export const CONTACT_PREFERENCE_ID = Object.freeze({
	EMAIL: 'email',
	POST: 'post'
} as const);

export const CONTACT_PREFERENCE: Prisma.ContactPreferenceCreateInput[] = [
	{
		id: CONTACT_PREFERENCE_ID.EMAIL,
		displayName: 'Email'
	},
	{
		id: CONTACT_PREFERENCE_ID.POST,
		displayName: 'Post'
	}
];

export const REPRESENTATION_SUBMITTED_FOR_ID = Object.freeze({
	MYSELF: 'myself',
	ON_BEHALF_OF: 'on-behalf-of'
} as const);

export const REPRESENTATION_SUBMITTED_FOR: Prisma.RepresentationSubmittedForCreateInput[] = [
	{
		id: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
		displayName: 'Myself'
	},
	{
		id: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
		displayName: 'On behalf of another person or an organisation'
	}
];

export const REPRESENTATION_STATUS_ID = Object.freeze({
	AWAITING_REVIEW: 'awaiting-review',
	ACCEPTED: 'accepted',
	REJECTED: 'rejected',
	WITHDRAWN: 'withdrawn'
} as const);

export const REPRESENTATION_STATUS: Prisma.RepresentationStatusCreateInput[] = [
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

export const REPRESENTED_TYPE_ID = Object.freeze({
	PERSON: 'person',
	ORGANISATION: 'organisation',
	ORG_NOT_WORK_FOR: 'household'
} as const);

export const REPRESENTED_TYPE: Prisma.RepresentedTypeCreateInput[] = [
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

export const WITHDRAWAL_REASON_ID = Object.freeze({
	CHANGE_OF_OPINION: 'change-of-opinion',
	MISTAKEN_SUBMISSION: 'mistaken-submission',
	MISUNDERSTANDING: 'misunderstanding',
	PERSONAL_REASONS: 'personal-reasons'
} as const);

export const WITHDRAWAL_REASON: Prisma.WithdrawalReasonCreateInput[] = [
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
const majorParentConnection: NonNullable<Prisma.CategoryCreateInput['ParentCategory']> = {
	connect: { id: 'major' }
};
const nonMajorParentConnection: NonNullable<Prisma.CategoryCreateInput['ParentCategory']> = {
	connect: { id: 'non-major' }
};

export const CATEGORIES: Prisma.CategoryCreateInput[] = [
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

type UpsertReferenceDataArgs =
	| {
			delegate: Prisma.ApplicationDecisionOutcomeDelegate;
			input: Prisma.ApplicationDecisionOutcomeCreateInput;
	  }
	| {
			delegate: Prisma.ApplicationTypeDelegate;
			input: Prisma.ApplicationTypeCreateInput;
	  }
	| {
			delegate: Prisma.ApplicationSubTypeDelegate;
			input: Prisma.ApplicationSubTypeCreateInput;
	  }
	| {
			delegate: Prisma.ApplicationStageDelegate;
			input: Prisma.ApplicationStageCreateInput;
	  }
	| {
			delegate: Prisma.ApplicationStatusDelegate;
			input: Prisma.ApplicationStatusCreateInput;
	  }
	| {
			delegate: Prisma.ApplicationProcedureDelegate;
			input: Prisma.ApplicationProcedureCreateInput;
	  }
	| {
			delegate: Prisma.ApplicationUpdateStatusDelegate;
			input: Prisma.ApplicationUpdateStatusCreateInput;
	  }
	| {
			delegate: Prisma.RepresentationReceivedMethodDelegate;
			input: Prisma.RepresentationReceivedMethodCreateInput;
	  }
	| {
			delegate: Prisma.RepresentationCategoryDelegate;
			input: Prisma.RepresentationCategoryCreateInput;
	  }
	| {
			delegate: Prisma.RepresentationSubmittedForDelegate;
			input: Prisma.RepresentationSubmittedForCreateInput;
	  }
	| {
			delegate: Prisma.RepresentationStatusDelegate;
			input: Prisma.RepresentationStatusCreateInput;
	  }
	| {
			delegate: Prisma.RepresentedTypeDelegate;
			input: Prisma.RepresentedTypeCreateInput;
	  }
	| {
			delegate: Prisma.ContactPreferenceDelegate;
			input: Prisma.ContactPreferenceCreateInput;
	  }
	| {
			delegate: Prisma.NotifyStatusDelegate;
			input: Prisma.NotifyStatusCreateInput;
	  }
	| {
			delegate: Prisma.WithdrawalReasonDelegate;
			input: Prisma.WithdrawalReasonCreateInput;
	  }
	| {
			delegate: Prisma.CrownDevelopmentToOrganisationRoleDelegate;
			input: Prisma.CrownDevelopmentToOrganisationRoleCreateInput;
	  }
	| {
			delegate: Prisma.CategoryDelegate;
			input: Prisma.CategoryCreateInput;
	  };

async function upsertReferenceData({ delegate, input }: UpsertReferenceDataArgs): Promise<void> {
	const { upsert } = delegate as unknown as { upsert: (args: unknown) => Promise<unknown> };
	await upsert({
		create: input,
		update: input,
		where: { id: input.id }
	});
}

export async function seedStaticData(dbClient: PrismaClient) {
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
		RECEIVED_METHOD.map((input) => upsertReferenceData({ delegate: dbClient.representationReceivedMethod, input }))
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

	await Promise.all(
		ORGANISATION_ROLES.map((input) =>
			upsertReferenceData({ delegate: dbClient.crownDevelopmentToOrganisationRole, input })
		)
	);

	const categories = CATEGORIES.filter((c) => !c.ParentCategory);
	const subCategories = CATEGORIES.filter((c) => c.ParentCategory);
	// order is important here - parent categories first
	await Promise.all(categories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));
	await Promise.all(subCategories.map((input) => upsertReferenceData({ delegate: dbClient.category, input })));

	console.log('static data seed complete');
}
