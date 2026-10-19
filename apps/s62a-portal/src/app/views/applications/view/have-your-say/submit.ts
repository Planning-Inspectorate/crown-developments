import type { S62APortalService } from '#service';
import { saveS62aRepresentation } from '@pins/crowndev-lib/forms/representations/s62a-save.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { uniqueReference } from '@pins/crowndev-lib/util/random-reference.js';
import { clearSessionData, popSessionData } from '@pins/crowndev-lib/util/session.ts';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { Journey } from '@planning-inspectorate/dynamic-forms';
import { list } from '@planning-inspectorate/dynamic-forms';
import type { Request, Response } from 'express';
import { clearHaveYourSayStarted } from './controller.ts';
import { JOURNEY_ID } from './journey.ts';

export const DECLARATION_ERROR = 'You must agree to all statements to submit your comment';

const PRIVACY_NOTICE_URL =
	'https://www.gov.uk/government/publications/planning-inspectorate-privacy-notices/customer-privacy-notice';

/**
 * The statements on the declaration page, all of which must be ticked
 */
export const DECLARATION_STATEMENTS: { value: string; text?: string; html?: string }[] = [
	{
		value: 'publish',
		text: 'By submitting this form, I acknowledge that my name, comment and any supporting attachments will be published on this website'
	},
	{
		value: 'privacy',
		html: `I have read and understood the <a class="govuk-link" href="${PRIVACY_NOTICE_URL}" target="_blank" rel="noreferrer noopener">Customer Privacy Notice (opens in a new tab)</a>.`
	},
	{
		value: 'contact',
		text: 'The Planning Inspectorate may contact me by email about my comment and supporting attachments'
	},
	{
		value: 'accurate',
		text: 'I have checked my submission to make sure it accurately reflects my views and does not contain misleading or false information'
	}
];

/** Session field the shared save uses for its errors, see saveS62aRepresentation */
const SAVE_ERROR_FIELD = 'representationError';
/** Session field the shared save puts the new reference in */
const REPRESENTATIONS_SESSION_FIELD = 'representations';

/**
 * Check your answers. Shows a problem the save found (e.g. an unanswered question) once.
 */
export async function viewCheckYourAnswersPage(req: Request, res: Response): Promise<void> {
	const applicationId = getStringParam(req.params, 'applicationId');
	const saveError = popSessionData<{ text?: { text: string }[] } | undefined>(
		req,
		applicationId,
		SAVE_ERROR_FIELD,
		undefined
	);

	await list(req, res, '', {
		declarationUrl: `${req.baseUrl}/declaration`,
		errorSummary: saveError ? saveError.text?.map(({ text }) => ({ text, href: '#' })) : undefined
	});
}

/**
 * The declaration page. Check your answers until every question has been answered.
 */
export function viewDeclarationPage(req: Request, res: Response): void {
	if (!isJourneyComplete(res)) {
		return res.redirect(`${req.baseUrl}/check-your-answers`);
	}
	renderDeclaration(req, res, []);
}

/**
 * Submits the representation once every statement has been agreed to
 */
export function buildSubmitRepresentation(
	service: S62APortalService,
	uniqueReferenceFn = uniqueReference
): AsyncRequestHandler {
	return async (req, res) => {
		const agreed = submittedStatements(req);
		if (DECLARATION_STATEMENTS.some(({ value }) => !agreed.includes(value))) {
			renderDeclaration(req, res, agreed, DECLARATION_ERROR);
			return;
		}

		await saveS62aRepresentation(
			{
				service,
				journeyId: JOURNEY_ID,
				checkYourAnswersUrl: `${req.baseUrl}/check-your-answers`,
				successUrl: `${req.baseUrl}/success`,
				uniqueReferenceFn
			},
			req,
			res
		);
	};
}

/**
 * The 'Written representation submitted' page. Shown once, straight after submitting.
 */
export function viewSuccessPage(req: Request, res: Response): void {
	const applicationId = getStringParam(req.params, 'applicationId');
	// both set by saveS62aRepresentation; only the reference is needed here
	const representationReference = popSessionData(
		req,
		applicationId,
		'representationReference',
		'',
		REPRESENTATIONS_SESSION_FIELD
	);
	clearSessionData(req, applicationId, 'representationSubmitted', REPRESENTATIONS_SESSION_FIELD);
	if (!representationReference) {
		return res.redirect(req.baseUrl);
	}
	clearSessionData(req, applicationId, 'attachments', 'files');
	// the journey is finished, so going back to a question asks them to start again
	clearHaveYourSayStarted(req, applicationId);

	res.render('views/applications/view/have-your-say/success.njk', {
		representationReference,
		applicationUrl: `/applications/${applicationId}/application-information`
	});
}

function isJourneyComplete(res: Response): boolean {
	const journey = res.locals.journey as Journey | undefined;
	return Boolean(journey?.isComplete());
}

/** The statements ticked, which a form sends as a string for one and an array for more */
function submittedStatements(req: Request): string[] {
	const { declaration } = (req.body ?? {}) as { declaration?: unknown };
	const values = Array.isArray(declaration) ? declaration : [declaration];
	return values.filter((value): value is string => typeof value === 'string');
}

function renderDeclaration(req: Request, res: Response, agreed: string[], error?: string) {
	res.render('views/applications/view/have-your-say/declaration.njk', {
		pageTitle: 'Declaration',
		backLinkUrl: `${req.baseUrl}/check-your-answers`,
		statements: DECLARATION_STATEMENTS.map((statement) => ({
			...statement,
			checked: agreed.includes(statement.value)
		})),
		declarationError: error,
		errorSummary: error ? [{ text: error, href: '#declaration' }] : undefined
	});
}
