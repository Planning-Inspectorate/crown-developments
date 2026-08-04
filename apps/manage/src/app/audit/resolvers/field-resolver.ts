import { formatAddress, formatBoolean, formatValue, formatYesNo } from '@pins/crowndev-lib/util/audit-formatters.ts';
import { camelCaseToSentenceCase } from '@pins/crowndev-lib/util/string.ts';
import { FIELD_DISPLAY_NAMES } from '../../views/cases/view/questions.ts';
import {
	APPLICATION_TYPES,
	APPLICATION_STATUS,
	APPLICATION_STAGE,
	APPLICATION_PROCEDURE,
	APPLICATION_DECISION_OUTCOME,
	CATEGORIES
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_DEV } from '@pins/crowndev-database/src/seed/data-lpa-dev.ts';
import { LOCAL_PLANNING_AUTHORITIES as LOCAL_PLANNING_AUTHORITIES_PROD } from '@pins/crowndev-database/src/seed/data-lpa-prod.ts';
import { loadEnvironmentConfig, ENVIRONMENT_NAME } from '../../config.js';

interface ResolverContext {
	userDisplayNameMap?: Map<string, string>;
}

/**
 * Creates a lookup map from id to displayName for reference data arrays.
 */
function createDisplayNameMap(
	items: ReadonlyArray<{ readonly id: string; readonly displayName: string }>
): Map<string, string> {
	return new Map(items.map((item) => [item.id, item.displayName]));
}

/**
 * Category type with optional parent connection (matches Prisma seed data structure).
 */
interface CategoryWithParent {
	readonly id: string;
	readonly displayName: string;
	readonly ParentCategory?: { readonly connect?: { readonly id?: string } };
}

/**
 * Creates a lookup map from category id to hierarchical display name.
 * For child categories, formats as "Parent name > Child name".
 * For parent categories, returns just the display name.
 */
function createCategoryDisplayNameMap(categories: ReadonlyArray<CategoryWithParent>): Map<string, string> {
	// First, build a simple id → displayName map for parent lookups
	const simpleMap = new Map(categories.map((cat) => [cat.id, cat.displayName]));

	// Then build the hierarchical map
	return new Map(
		categories.map((category) => {
			const parentId = category.ParentCategory?.connect?.id;
			if (parentId) {
				const parentName = simpleMap.get(parentId) ?? '-';
				return [category.id, `${parentName} > ${category.displayName}`];
			}
			return [category.id, category.displayName];
		})
	);
}

/**
 * Creates a lookup map from id to name for LPA data.
 * Handles both dev and prod environments.
 */
function createLpaDisplayNameMap(): Map<string, string> {
	let lpas;
	try {
		const env = loadEnvironmentConfig();
		lpas = env === ENVIRONMENT_NAME.PROD ? LOCAL_PLANNING_AUTHORITIES_PROD : LOCAL_PLANNING_AUTHORITIES_DEV;
	} catch {
		lpas = LOCAL_PLANNING_AUTHORITIES_DEV;
	}
	return new Map(
		lpas
			.filter((lpa): lpa is typeof lpa & { id: string; name: string } => Boolean(lpa.id && lpa.name))
			.map((lpa) => [lpa.id, lpa.name])
	);
}

// Lookup maps for reference data
const APPLICATION_TYPE_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_TYPES);
const APPLICATION_STATUS_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_STATUS);
const APPLICATION_STAGE_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_STAGE);
const APPLICATION_PROCEDURE_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_PROCEDURE);
const APPLICATION_DECISION_OUTCOME_DISPLAY_NAMES = createDisplayNameMap(APPLICATION_DECISION_OUTCOME);
const CATEGORY_DISPLAY_NAMES = createCategoryDisplayNameMap(CATEGORIES);
const LPA_DISPLAY_NAMES = createLpaDisplayNameMap();

/**
 * Returns a human-readable display name for a field.
 * Uses the FIELD_DISPLAY_NAMES lookup, falling back to sentence case conversion.
 */
export function getFieldDisplayName(fieldName: string): string {
	return FIELD_DISPLAY_NAMES[fieldName] ?? camelCaseToSentenceCase(fieldName);
}

/**
 * A field resolver takes the previous case row and the new form answer
 * and returns human-readable old/new values for the audit trail.
 */
interface FieldResolver {
	resolve(
		previousCase: Record<string, unknown>,
		newAnswer: unknown,
		context?: ResolverContext
	): { oldValue: string; newValue: string };
}

/**
 * Default resolver for simple scalar fields where the form field name
 * matches the DB column name (e.g. externalReference, name, location).
 */
function defaultResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: formatValue(previousCase[fieldName]),
				newValue: formatValue(newAnswer)
			};
		}
	};
}

/**
 * Resolver for boolean fields.
 * Previous values from the DB view model are 'yes'/'no' strings; new values from the save model are true booleans.
 */
function booleanResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: formatYesNo(previousCase[fieldName] as string | null | undefined),
				newValue: formatBoolean(newAnswer as boolean | null | undefined)
			};
		}
	};
}

/**
 * Creates a resolver for ID fields that map to display names via a lookup table.
 * Falls back to '[Unknown value]' if no display name is found.
 */
function createLookupResolver(fieldName: string, displayNameMap: Map<string, string>): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			const oldId = previousCase[fieldName] as string | null | undefined;
			const newId = newAnswer as string | null | undefined;

			const oldValue = oldId ? (displayNameMap.get(oldId) ?? '[Unknown value]') : '-';
			const newValue = newId ? (displayNameMap.get(newId) ?? '[Unknown value]') : '-';

			return { oldValue, newValue };
		}
	};
}

function monetaryResolver(fieldName: string): FieldResolver {
	return {
		resolve(previousCase, newAnswer) {
			return {
				oldValue: previousCase[fieldName] ? `£${(previousCase[fieldName] as number).toFixed(2)}` : '-',
				newValue: newAnswer ? `£${(newAnswer as number).toFixed(2)}` : '-'
			};
		}
	};
}

/**
 * Registry of field-specific resolvers.
 *
 * Add an entry here whenever a field needs special handling — e.g. the
 * form value is a composite ID, the DB column has a different name, or
 * the value needs to be looked up from a reference table.
 *
 * Fields not in this map fall through to the default resolver, which
 * simply stringifies the raw values.
 */
const FIELD_RESOLVERS: Record<string, FieldResolver> = {
	/**
	 * Site address — the form submits an address object, the DB stores it
	 * as a relation. Formats both as a comma-separated address string.
	 */
	siteAddress: {
		resolve(previousCase, newAnswer) {
			const oldAddress = previousCase.SiteAddress as Record<string, unknown> | null;
			const newAddress = newAnswer as Record<string, unknown> | null;

			return {
				oldValue: formatAddress(oldAddress),
				newValue: formatAddress(newAddress)
			};
		}
	},

	// ── Reference table ID fields ────────────────────────────────────────
	// These fields store IDs that map to display names in static reference data.

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
	lpaId: createLookupResolver('lpaId', LPA_DISPLAY_NAMES),

	/** Secondary local planning authority */
	secondaryLpaId: createLookupResolver('secondaryLpaId', LPA_DISPLAY_NAMES),

	// ── Boolean fields ────────────────────────────────────────────────────
	// Previous values are 'yes'/'no' strings from the view model; new values are true booleans from the save model.

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

	// ── Long string fields ────────────────────────────────────────────────
	// These fields store long text fields such as 250 characters plus

	description: defaultResolver('description'),
	costsApplicationsComment: defaultResolver('costsApplicationsComment'),

	// ── Monetary fields ────────────────────────────────────────────────────────
	// Values need to be formatted with currency '£' as a prefix

	/** Community Infrastructure Levy (CIL) amount */
	cilAmount: monetaryResolver('cilAmount'),
	/** Application fee amount */
	applicationFee: monetaryResolver('applicationFee'),
	/** Application fee refund amount */
	applicationFeeRefundAmount: monetaryResolver('applicationFeeRefundAmount')
};

/**
 * Resolves human-readable old and new values for a given field.
 *
 * Looks up a field-specific resolver first; falls back to the default
 * scalar resolver if none is registered.
 */
export function resolveFieldValues(
	fieldName: string,
	previousCase: Record<string, unknown>,
	newAnswer: unknown,
	context?: ResolverContext
): { oldValue: string; newValue: string } {
	const resolver = FIELD_RESOLVERS[fieldName] ?? defaultResolver(fieldName);
	return resolver.resolve(previousCase, newAnswer, context);
};
