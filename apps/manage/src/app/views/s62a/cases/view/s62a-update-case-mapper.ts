import { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { SITE_AREA_UNIT_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import { viewModelToAddressUpdateInput } from '@pins/crowndev-lib/util/address.ts';
import type { YesNo } from '@pins/crowndev-lib/util/types.ts';
import { type Address, yesNoToBoolean } from '@planning-inspectorate/dynamic-forms';

export interface UpdateCaseAnswers {
	s62aStatusId?: string;
	developmentDescription?: string;
	typeId?: string;
	applicationPhaseId?: string | null;
	classificationId?: string | null;
	lpaId?: string;
	hasSecondaryLpa?: YesNo;
	secondaryLpaId?: string | null;
	siteNorthing?: number;
	siteEasting?: number;
	siteAreaHectares?: number;
	siteAreaSquareMetres?: number;
	expectedSubmissionDate?: Date;
	specialismId?: string;
	inspectorBandId?: string;
	subTypeId?: string;
	siteIsVisibleFromPublicLand?: YesNo;
	siteAddress?: Address;
	likelyIssues?: string;
}

export class S62aCaseUpdateMapper {
	private answers: UpdateCaseAnswers;

	constructor(answers: UpdateCaseAnswers) {
		this.answers = answers;
	}

	/**
	 * Transforms the partial update payload into a Prisma Update Input.
	 */
	public generateUpdateInput(): Prisma.S62aCaseUpdateInput {
		const input: Prisma.S62aCaseUpdateInput = {};

		this.mapScalars(input);
		this.mapLookups(input);
		this.mapAddress(input);

		return input;
	}

	/**
	 * Handles basic scalar fields, things that are just columns
	 * on the base S62A table.
	 */
	private mapScalars(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('developmentDescription')) {
			input.description = ans.developmentDescription || '';
		}

		if (this.hasAnswer('likelyIssues')) {
			input.likelyIssues = ans.likelyIssues || null;
		}

		if (this.hasAnswer('expectedSubmissionDate')) {
			input.expectedSubmissionDate = ans.expectedSubmissionDate;
		}

		if (this.hasAnswer('hasSecondaryLpa')) {
			input.hasSecondaryLpa = yesNoToBoolean(ans.hasSecondaryLpa);
		}

		this.mapLocationScalars(input);
	}

	/**
	 * Maps fields to do with the location (e.g. site northing, site area...)
	 */
	private mapLocationScalars(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (this.hasAnswer('siteIsVisibleFromPublicLand')) {
			input.siteIsVisibleFromPublicLand = ans.siteIsVisibleFromPublicLand
				? yesNoToBoolean(ans.siteIsVisibleFromPublicLand)
				: null;
		}

		if (this.hasAnswer('siteNorthing')) {
			input.siteNorthing = ans.siteNorthing || ans.siteNorthing === 0 ? Number(ans.siteNorthing) : null;
		}

		if (this.hasAnswer('siteEasting')) {
			input.siteEasting = ans.siteEasting || ans.siteEasting === 0 ? Number(ans.siteEasting) : null;
		}

		if (this.hasAnswer('siteAreaSquareMetres') || this.hasAnswer('siteAreaHectares')) {
			if (ans.siteAreaSquareMetres) {
				input.siteAreaInSquareMetres = Number(ans.siteAreaSquareMetres);
				input.SiteAreaOriginalUnit = { connect: { id: SITE_AREA_UNIT_ID.METRES_SQUARED } };
			} else if (ans.siteAreaHectares) {
				input.siteAreaInSquareMetres = new Prisma.Decimal(ans.siteAreaHectares).times(10000);
				input.SiteAreaOriginalUnit = { connect: { id: SITE_AREA_UNIT_ID.HECTARES } };
			} else {
				input.siteAreaInSquareMetres = null;
				input.SiteAreaOriginalUnit = { disconnect: true };
			}
		}
	}

	/**
	 * Handles fields that are joins onto another table, still basic
	 * not handling things like many-many complex joins.
	 */
	private mapLookups(input: Prisma.S62aCaseUpdateInput): void {
		const ans = this.answers;

		if (ans.s62aStatusId) input.S62aStatus = { connect: { id: ans.s62aStatusId } };

		if (ans.typeId) input.Type = { connect: { id: ans.typeId } };

		if (ans.lpaId) input.Lpa = { connect: { id: ans.lpaId } };

		if (this.hasAnswer('applicationPhaseId')) {
			input.ApplicationPhase = ans.applicationPhaseId
				? { connect: { id: ans.applicationPhaseId } }
				: { disconnect: true };
		}

		if (this.hasAnswer('classificationId')) {
			input.Classification = ans.classificationId ? { connect: { id: ans.classificationId } } : { disconnect: true };
		}

		if (this.hasAnswer('secondaryLpaId')) {
			input.SecondaryLpa = ans.secondaryLpaId ? { connect: { id: ans.secondaryLpaId } } : { disconnect: true };
		}

		if (this.hasAnswer('specialismId')) {
			input.Specialism = ans.specialismId ? { connect: { id: ans.specialismId } } : { disconnect: true };
		}

		if (this.hasAnswer('inspectorBandId')) {
			input.InspectorBand = ans.inspectorBandId ? { connect: { id: ans.inspectorBandId } } : { disconnect: true };
		}

		if (this.hasAnswer('subTypeId')) {
			input.SubType = ans.subTypeId ? { connect: { id: ans.subTypeId } } : { disconnect: true };
		}
	}

	/**
	 * Handles the semi-unique case of addresses being an object with unpopulated / populated keys
	 */
	private mapAddress(input: Prisma.S62aCaseUpdateInput): void {
		if (this.hasAnswer('siteAddress')) {
			const addressData = viewModelToAddressUpdateInput(this.answers.siteAddress!);
			input.SiteAddress = { upsert: { create: addressData, update: addressData } };
		}
	}

	/**
	 * Checks if we have received "something" from the input (even if that's null or '')
	 */
	private hasAnswer(key: keyof UpdateCaseAnswers): boolean {
		return this.answers[key] !== undefined;
	}
}
