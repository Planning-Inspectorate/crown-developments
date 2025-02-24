import { Prisma } from '@prisma/client';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';

/**
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {import('pino').BaseLogger} logger
 * @returns {import('express').Handler}
 */
export function buildPublishCase({ db, logger }) {
	return async (req, res) => {
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}
		try {
			await db.crownDevelopment.update({
				where: { id },
				data: {
					publishDate: new Date()
				}
			});
		} catch (e) {
			// don't show Prisma errors to the user
			if (e instanceof Prisma.PrismaClientKnownRequestError) {
				logger.error({ id, error: e }, 'error publishing case');
				throw new Error(`Error publishing case (${e.code})`);
			}
			if (e instanceof Prisma.PrismaClientValidationError) {
				logger.error({ id, error: e }, 'error publishing case');
				throw new Error(`Error publishing case (${e.name})`);
			}
			throw e;
		}
		return res.redirect(`/cases/${id}/publish/success`);
	};
}

/**
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {import('pino').BaseLogger} logger
 * @returns {import('express').Handler}
 */
export function buildGetValidatedCaseMiddleware({ db, logger }) {
	return async (req, res, next) => {
		const id = req.params.id;
		if (!id) {
			throw new Error('id param required');
		}
		logger.info({ id }, 'publish case');

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			include: {
				ApplicantContact: { include: { Address: true } },
				AgentContact: { include: { Address: true } },
				Lpa: { include: { Address: true } }
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const answers = [
			{
				value: crownDevelopment.description,
				errorMessage: 'Enter Application Description'
			},
			{
				value: crownDevelopment.typeId,
				errorMessage: 'Enter Application Type'
			},
			{
				value: crownDevelopment.ApplicantContact?.fullName,
				errorMessage: 'Enter Applicant Contact Name'
			},
			{
				value: crownDevelopment.Lpa?.id,
				errorMessage: 'Enter Local Planning Authority'
			}
		];

		const errors = [];
		for (const answer of answers) {
			if (!answer.value) {
				errors.push({
					text: answer.errorMessage,
					href: `#`
				});
			}
		}

		if (errors.length > 0) {
			addSessionData(req, id, { publishErrors: errors });
			return res.redirect(`/cases/${id}`);
		}

		const reference = crownDevelopment.reference;
		addSessionData(req, id, { reference, casePublished: true });
		return next();
	};
}

/**
 * @type {import('express').Handler}
 */
export async function publishSuccessfulController(req, res) {
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}

	const reference = readSessionData(req, id, 'reference');
	const casePublished = readSessionData(req, id, 'casePublished');

	if (!reference || !casePublished) {
		throw new Error('invalid publish case session');
	}

	const data = {
		id,
		reference
	};
	clearSessionData(req, id, ['reference', 'casePublished']);
	res.render('views/cases/view/publish/success.njk', {
		...data
	});
}
