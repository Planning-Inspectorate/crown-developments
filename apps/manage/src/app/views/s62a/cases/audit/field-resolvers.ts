import { APPLICATION_PROCEDURE, APPLICATION_TYPES } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	APPLICANT_TYPES,
	DECISION_OUTCOMES,
	INSPECTOR_BANDS,
	MAJOR_OR_NON_MAJORS,
	OUTCOME_TYPES,
	PRE_APPLICATION_ADVICE,
	S62A_APPLICATION_STATUSES,
	S62A_CATEGORIES,
	S62A_PRE_APPLICATION_STATUSES,
	S62A_STAGES,
	SITE_VISIT_TYPES,
	SPECIALISMS
} from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import {
	type FieldResolver,
	type FieldResolverRegistry,
	addressResolver,
	booleanResolver,
	createDisplayNameMap,
	createLookupResolver,
	dateRangeResolver,
	dateResolver,
	entraUserResolver,
	lpaLookupResolver,
	monetaryResolver
} from '@pins/crowndev-lib/audit/resolvers/index.ts';

/**
 * S62A audit configuration.
 *
 * Every key here is a question `fieldName` from the S62A questions
 * (`views/s62a/cases/view/questions.ts`), or a companion answer key that a
 * custom component saves alongside its question (e.g. `applicationFee`).
 *
 * `audit-coverage.test.ts` checks this against the questions, so a new
 * editable question fails the build until it is either audited here or
 * listed as not yet audited in that test.
 */

/**
 * The pre-application case linked to an application (when advice is from PINS).
 *
 * The answer is the linked case's ID, so it's shown as that case's reference.
 * The old reference comes from the view model, which sets
 * preApplicationReference to the linked case's reference. The new one is
 * looked up by the save handler and passed in the context. Either falls back
 * to the raw ID if the reference can't be found.
 */
const preApplicationCaseResolver: FieldResolver = {
	resolve(previousCase, newAnswer, context) {
		const references = context?.referenceNames?.preApplicationCaseId;
		const oldId = typeof previousCase.preApplicationCaseId === 'string' ? previousCase.preApplicationCaseId : undefined;
		const newId = typeof newAnswer === 'string' && newAnswer !== '' ? newAnswer : undefined;
		const previousReference =
			typeof previousCase.preApplicationReference === 'string' ? previousCase.preApplicationReference : undefined;

		const referenceFor = (id: string | undefined): string => {
			if (!id) return '-';
			return references?.get(id) ?? (id === oldId ? previousReference : undefined) ?? id;
		};

		return {
			oldValue: oldId ? (previousReference ?? referenceFor(oldId)) : '-',
			newValue: referenceFor(newId)
		};
	}
};

/** Builds a lookup resolver from static reference data. */
function lookup(
	fieldName: string,
	items: ReadonlyArray<{ readonly id: string; readonly displayName: string }>
): FieldResolver {
	return createLookupResolver(fieldName, createDisplayNameMap(items));
}

// ── Fields handled by the default resolver ───────────────────────────────

/** Short text fields. The default resolver shows the raw value. */
const TEXT_FIELDS = [
	'lpaReference',
	'listedBuildingReference',
	'pressNoticePlaced',
	'pressNoticeReference',
	'customerNumber',
	'preApplicationReference',
	'agentName',
	/** Hearing venue */
	'venue'
] as const;

/**
 * Long text fields. These render with expandable old/new value details
 * in the case history instead of inline audit text.
 */
const LONG_TEXT_FIELDS = [
	'developmentDescription',
	'likelyIssues',
	'healthAndSafetyIssue',
	'wasteActivitiesDescription'
] as const;

// ── Date fields ──────────────────────────────────────────────────────────

/** Date-only fields. */
const DATE_FIELDS = [
	'expectedSubmissionDate',
	'notificationReceivedDate',
	'applicationReceivedDate',
	'applicationAcknowledgedDate',
	'furtherInformationRequestedDate',
	'agreedForAdditionalInformationDate',
	'applicationValidDate',
	'validLettersSentDate',
	'lpaQuestionnaireSentDate',
	'lpaQuestionnaireReceivedDate',
	'pressNoticeDate',
	'neighboursNotifiedByLpaDate',
	'lpaInterestedPartiesDeadlineDate',
	'siteNoticeByLpaDate',
	'interestedPartiesPressNoticeDeadlineDate',
	'mineralApplicationsDate',
	'interimFindingsDate',
	's106SubmittedDate',
	'extendedTargetDecisionDate',
	'recoveredDate',
	'withdrawnDate',
	'turnedAwayDate',
	'chargingScheduleSentDate',
	'invoiceDate',
	'preApplicationFeeReceivedDate',
	'applicationFeeReceivedDate',
	'applicationFeeRefundDate',
	'representationsPublishDate',
	'environmentalStatementReceivedDate',
	'preApplicationReceivedDate',
	'preApplicationAdviceIssuedDate',
	'decisionDate',
	'recoveredReportSentDate',
	/** Notice of procedure date */
	'procedureNotificationDate',
	'hearingDate',
	/** Hearing notification date */
	'notificationDate',
	'additionalMeetingDate',
	/** Hearing issues report published date */
	'issuesReportingPublishedDate',
	'siteVisitDate'
] as const;

// ── Registry ─────────────────────────────────────────────────────────────

/**
 * Field resolvers for the S62A data model.
 *
 * Fields not in this map (TEXT_FIELDS and LONG_TEXT_FIELDS) fall through
 * to the default resolver, which simply stringifies the raw values.
 */
export const S62A_FIELD_RESOLVERS: FieldResolverRegistry = {
	// ── Reference table ID fields ────────────────────────────────────────

	typeId: lookup('typeId', APPLICATION_TYPES),
	classificationId: lookup('classificationId', MAJOR_OR_NON_MAJORS),
	specialismId: lookup('specialismId', SPECIALISMS),
	inspectorBandId: lookup('inspectorBandId', INSPECTOR_BANDS),
	/** Status list depends on the phase, so both are included */
	s62aStatusId: lookup('s62aStatusId', [...S62A_APPLICATION_STATUSES, ...S62A_PRE_APPLICATION_STATUSES]),
	stageId: lookup('stageId', S62A_STAGES),
	categoryId: lookup('categoryId', S62A_CATEGORIES),
	procedureId: lookup('procedureId', APPLICATION_PROCEDURE),
	applicantType: lookup('applicantType', APPLICANT_TYPES),
	preApplicationAdviceId: lookup('preApplicationAdviceId', PRE_APPLICATION_ADVICE),
	outcomeTypeId: lookup('outcomeTypeId', OUTCOME_TYPES),
	decisionOutcomeId: lookup('decisionOutcomeId', DECISION_OUTCOMES),
	siteVisitTypeId: lookup('siteVisitTypeId', SITE_VISIT_TYPES),

	lpaId: lpaLookupResolver('lpaId'),

	/** The linked pre-application case, shown by its reference */
	preApplicationCaseId: preApplicationCaseResolver,
	secondaryLpaId: lpaLookupResolver('secondaryLpaId'),

	// ── Entra user fields ─────────────────────────────────────────────────

	caseOfficerId: entraUserResolver('caseOfficerId'),
	assessorInspectorId: entraUserResolver('assessorInspectorId'),
	planningOfficerId: entraUserResolver('planningOfficerId'),
	readerId: entraUserResolver('readerId'),

	// ── Boolean fields ────────────────────────────────────────────────────

	hasSecondaryLpa: booleanResolver('hasSecondaryLpa'),
	siteIsVisibleFromPublicLand: booleanResolver('siteIsVisibleFromPublicLand'),
	isGreenBelt: booleanResolver('isGreenBelt'),
	bngExempt: booleanResolver('bngExempt'),
	eiaScreening: booleanResolver('eiaScreening'),
	eiaScreeningOutcome: booleanResolver('eiaScreeningOutcome'),
	hasAgent: booleanResolver('hasAgent'),
	isWasteManagementDevelopment: booleanResolver('isWasteManagementDevelopment'),
	hasResidentialUnitsChange: booleanResolver('hasResidentialUnitsChange'),
	hasExistingHousing: booleanResolver('hasExistingHousing'),
	hasProposedHousing: booleanResolver('hasProposedHousing'),
	hasNonResidentialFloorspaceChange: booleanResolver('hasNonResidentialFloorspaceChange'),
	cilLiable: booleanResolver('cilLiable'),
	hasPreApplicationFee: booleanResolver('hasPreApplicationFee'),
	hasApplicationFee: booleanResolver('hasApplicationFee'),
	eligibleForFeeRefund: booleanResolver('eligibleForFeeRefund'),

	// ── Monetary fields ───────────────────────────────────────────────────

	cilAmount: monetaryResolver('cilAmount'),
	preApplicationFee: monetaryResolver('preApplicationFee'),
	applicationFee: monetaryResolver('applicationFee'),
	applicationFeeRefundAmount: monetaryResolver('applicationFeeRefundAmount'),
	pressNoticeCost: monetaryResolver('pressNoticeCost'),

	// ── Address fields ────────────────────────────────────────────────────

	siteAddress: addressResolver('siteAddress'),
	agentAddress: addressResolver('agentAddress'),

	// ── Date fields ───────────────────────────────────────────────────────

	representationsPeriod: dateRangeResolver('representationsPeriod'),
	reconsultationDetailsDate: dateRangeResolver('reconsultationDetailsDate'),
	...Object.fromEntries(DATE_FIELDS.map((fieldName) => [fieldName, dateResolver(fieldName)]))
};

// ── Sets used by the save handler ────────────────────────────────────────

/**
 * Scalar fields that should be audited when updated.
 * Only these fields will produce audit entries in recordAuditEntries.
 */
export const AUDITABLE_SCALAR_FIELDS: ReadonlySet<string> = new Set([
	...TEXT_FIELDS,
	...LONG_TEXT_FIELDS,
	...Object.keys(S62A_FIELD_RESOLVERS)
]);

/**
 * Long-text fields that render with expandable old/new value details
 * instead of inline audit text.
 */
export const LONG_AUDIT_FIELDS: ReadonlySet<string> = new Set(LONG_TEXT_FIELDS);

// ── Audit labels ─────────────────────────────────────────────────────────

/**
 * Field names to use in the case history instead of the question title.
 *
 * Question titles are written to sit under a heading on the case page, so
 * some don't make sense on their own in the history (e.g. "Has existing"
 * under "Existing residential"). Some fields also have no title of their
 * own, because a custom component saves them alongside another question.
 *
 * These take priority over the question titles.
 */
export const S62A_AUDIT_FIELD_LABELS: Readonly<Record<string, string>> = {
	// Titles that only make sense under their heading on the page
	hasExistingHousing: 'Has existing housing',
	hasProposedHousing: 'Has proposed housing',
	hasAgent: 'Has agent',
	siteIsVisibleFromPublicLand: 'Site visible from public land',
	siteVisitDate: 'Site visit date',
	additionalMeetingDate: 'Additional meeting date',
	mineralApplicationsDate: 'Mineral applications date',

	// Fee questions: the yes/no answer and the amount share one question
	hasApplicationFee: 'Has application fee',
	applicationFee: 'Application fee amount',
	hasPreApplicationFee: 'Has pre-application fee',
	preApplicationFee: 'Pre-application fee amount',
	eligibleForFeeRefund: 'Eligible for fee refund',
	applicationFeeRefundAmount: 'Fee refund amount',

	// The CIL liable and CIL amount questions share the fieldName cilLiable,
	// so without these the liable answer would show as "CIL amount"
	cilLiable: 'CIL liable',
	cilAmount: 'CIL amount'
};
