import {
	APPLICATION_TYPES,
	APPLICATION_STATUS,
	APPLICATION_STAGE,
	APPLICATION_PROCEDURE,
	APPLICATION_DECISION_OUTCOME,
	CATEGORIES
} from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	type FieldResolverRegistry,
	addressResolver,
	booleanResolver,
	createCategoryDisplayNameMap,
	createDisplayNameMap,
	createLookupResolver,
	dateAndTimeResolver,
	dateRangeResolver,
	defaultResolver,
	entraUserResolver,
	lpaLookupResolver,
	monetaryResolver
} from '@pins/crowndev-lib/audit/resolvers/index.ts';

// Lookup maps for Crown reference data
const APPLICATION_TYPE_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_TYPES);
const APPLICATION_STATUS_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_STATUS);
const APPLICATION_STAGE_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_STAGE);
const APPLICATION_PROCEDURE_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_PROCEDURE);
const APPLICATION_DECISION_OUTCOME_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_DECISION_OUTCOME);
const CATEGORY_DISPLAY_NAMES = createCategoryDisplayNameMap(CATEGORIES);

/**
 * Field resolvers for the Crown Development data model.
 *
 * Add an entry here whenever a Crown field needs special handling — e.g. the
 * form value is a composite ID, the DB column has a different name, or
 * the value needs to be looked up from a reference table.
 *
 * Fields not in this map fall through to the default resolver, which
 * simply stringifies the raw values.
 */
export const CROWN_FIELD_RESOLVERS: FieldResolverRegistry = {
	// -- Reference table ID fields ----------------------------------------

	/** Application type (e.g. 'planning-permission' → 'Planning permission') */
	typeId: createLookupResolver('typeId', APPLICATION_TYPE_DISPLAY_NAMES),

	/** Application status (e.g. 'new' → 'New') */
	statusId: createLookupResolver('statusId', APPLICATION_STATUS_DISPLAY_NAMES),

	/** Application stage (e.g. 'acceptance' → 'Accepted') */
	stageId: createLookupResolver('stageId', APPLICATION_STAGE_DISPLAY_NAMES),

	/** Procedure type (e.g. 'inquiry' → 'Inquiry') */
	procedureId: createLookupResolver('procedureId', APPLICATION_PROCEDURE_DISPLAY_NAMES),

	/** Decision outcome (e.g. 'approved' → 'Approved') */
	decisionOutcomeId: createLookupResolver('decisionOutcomeId', APPLICATION_DECISION_OUTCOME_DISPLAY_NAMES),

	/** Category/sub-category (e.g. 'major-minerals' → 'Major Development > Minerals') */
	subCategoryId: createLookupResolver('subCategoryId', CATEGORY_DISPLAY_NAMES),

	/** Local planning authority */
	lpaId: lpaLookupResolver('lpaId'),

	/** Secondary local planning authority */
	secondaryLpaId: lpaLookupResolver('secondaryLpaId'),

	// -- Boolean fields ----------------------------------------------------

	hasSecondaryLpa: booleanResolver('hasSecondaryLpa'),
	containsDistressingContent: booleanResolver('containsDistressingContent'),
	hasAgent: booleanResolver('hasAgent'),
	nationallyImportant: booleanResolver('nationallyImportant'),
	isGreenBelt: booleanResolver('isGreenBelt'),
	siteIsVisibleFromPublicLand: booleanResolver('siteIsVisibleFromPublicLand'),
	environmentalImpactAssessment: booleanResolver('environmentalImpactAssessment'),
	developmentPlan: booleanResolver('developmentPlan'),
	rightOfWay: booleanResolver('rightOfWay'),
	eiaScreening: booleanResolver('eiaScreening'),
	eiaScreeningOutcome: booleanResolver('eiaScreeningOutcome'),
	hasApplicationFee: booleanResolver('hasApplicationFee'),
	eligibleForFeeRefund: booleanResolver('eligibleForFeeRefund'),
	cilLiable: booleanResolver('cilLiable'),
	bngExempt: booleanResolver('bngExempt'),
	hasCostsApplications: booleanResolver('hasCostsApplications'),
	applicationReceivedDateEmailSent: booleanResolver('applicationReceivedDateEmailSent'),
	lpaQuestionnaireSpecialEmailSent: booleanResolver('lpaQuestionnaireSpecialEmailSent'),
	lpaQuestionnaireReceivedEmailSent: booleanResolver('lpaQuestionnaireReceivedEmailSent'),
	notNationallyImportantEmailSent: booleanResolver('notNationallyImportantEmailSent'),

	// -- Long string fields ------------------------------------------------

	description: defaultResolver('description'),
	costsApplicationsComment: defaultResolver('costsApplicationsComment'),

	// -- Address fields ----------------------------------------------------

	siteAddress: addressResolver('siteAddress'),
	agentOrganisationAddress: addressResolver('agentOrganisationAddress'),

	// -- Monetary fields ---------------------------------------------------

	/** Community Infrastructure Levy (CIL) amount */
	cilAmount: monetaryResolver('cilAmount'),
	/** Application fee amount */
	applicationFee: monetaryResolver('applicationFee'),
	/** Application fee refund amount */
	applicationFeeRefundAmount: monetaryResolver('applicationFeeRefundAmount'),

	// -- Entra fields ------------------------------------------------------

	inspector1Id: entraUserResolver('inspector1Id'),
	inspector2Id: entraUserResolver('inspector2Id'),
	inspector3Id: entraUserResolver('inspector3Id'),
	assessorInspectorId: entraUserResolver('assessorInspectorId'),
	caseOfficerId: entraUserResolver('caseOfficerId'),
	planningOfficerId: entraUserResolver('planningOfficerId'),

	// -- Complex date fields -----------------------------------------------
	// Date-only fields are handled by the default resolver.

	/** Date fields with a range, e.g. start and end date */
	representationsPeriod: dateRangeResolver('representationsPeriod'),
	/** Date fields that also include a time component */
	siteVisitDate: dateAndTimeResolver('siteVisitDate')
};
