import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms';
import { JOURNEY_ID } from './journey.ts';
import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import { S62aCaseMapper, type CreateCaseAnswers, type CreateInputOptions } from './s62a-case-mapper.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { RequestHandler } from 'express';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

export function buildSaveController(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}

		const journeyResponse = res.locals.journeyResponse;
		const answers = journeyResponse.answers as unknown as CreateCaseAnswers;

		if (typeof answers !== 'object') {
			throw new Error('answers should be an object');
		}

		const { id, reference } = await db.$transaction(async ($tx) => {
			async function createCase(caseRef: string, extraData: Partial<Prisma.S62aCaseCreateInput> = {}) {
				const input = toCreateInput(answers, caseRef);

				Object.assign(input, extraData);

				logger.info({ reference: caseRef }, 'creating a new s62a case');
				const created = await $tx.s62aCase.create({ data: input });
				logger.info({ reference: caseRef }, 'created a new s62a case');

				return created;
			}

			const generatedRef = await generateS62aReference($tx, answers.applicationPhase);

			const created = await createCase(generatedRef);

			return {
				id: created.id,
				reference: generatedRef
			};
		});

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID,
			replaceWith: {
				id,
				reference
			}
		});

		res.redirect(`${req.baseUrl}/success`);
	};
}

/**
 * Instantiates and calls mapper class to handle the entire
 * creation process.
 */
export function toCreateInput(
	answers: CreateCaseAnswers,
	reference: string,
	options: CreateInputOptions = {}
): Prisma.S62aCaseCreateInput {
	const mapper = new S62aCaseMapper(answers, reference, options);
	return mapper.generateCreateInput();
}

/**
 * Safely extracts the 7-digit ID from the end of an S62A reference.
 * Works for both the formats: 'S62A/PRE/YYYY/XXXXXXX' and 'S62A/YYYY/XXXXXXX'
 */
function idFromS62aReference(reference: string): number | null {
	const match = reference.match(/\/(\d+)$/);
	if (!match) return null;

	const parsed = parseInt(match[1], 10);
	return isNaN(parsed) ? null : parsed;
}

/**
 * Generates a new case reference formatted for S62A applications.
 */
export async function generateS62aReference(
	db: TransactionClient,
	applicationPhaseId: string | undefined,
	date: Date = new Date()
): Promise<string> {
	if (!applicationPhaseId) throw new Error('applicationPhase needed for reference generation');

	const latestCases = await db.s62aCase.findMany({
		where: {
			applicationPhaseId
		},
		select: { reference: true },
		take: 5,
		orderBy: {
			createdDate: 'desc'
		}
	});

	let latestId = 0;
	for (const latestCase of latestCases) {
		const id = idFromS62aReference(latestCase.reference);
		if (id !== null) {
			latestId = id;
			break;
		}
	}

	const year = date.getFullYear().toString();
	const nextId = (latestId + 1).toString().padStart(7, '0');

	const isPreApp = applicationPhaseId === PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION;

	return isPreApp ? `S62A/PRE/${year}/${nextId}` : `S62A/${year}/${nextId}`;
}

/**
 * Controller that populates the success page allowing user to see their new
 * case reference and go to its new details page.
 */
export function buildSuccessController(): RequestHandler {
	return (req, res) => {
		const data = req.session?.forms && req.session?.forms[JOURNEY_ID];

		if (!data || typeof data !== 'object' || !('id' in data) || !('reference' in data)) {
			throw new Error('invalid create case session');
		}

		if (!data.id || typeof data.id !== 'string' || !data.reference || typeof data.reference !== 'string') {
			throw new Error('Case ID or reference missing');
		}

		clearDataFromSession({ req, journeyId: JOURNEY_ID });

		res.render('views/s62a/cases/create-a-case/success.njk', {
			reference: data.reference,
			caseListUrl: '/s62a/cases',
			caseDetailsUrl: `/s62a/cases/${data.id}`
		});
	};
}
