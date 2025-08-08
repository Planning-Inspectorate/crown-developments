import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

/**
 *
 * @param {import('#service').ManageService} service
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
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'publishing case',
				logParams: { id }
			});
		}
		return res.redirect(`/cases/${id}/publish/success`);
	};
}

/**
 *
 * @param {import('#service').ManageService} service
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
				errorMessage: 'Enter Development Description',
				pageLink: 'development-description'
			},
			{
				value: crownDevelopment.typeId,
				errorMessage: 'Enter Application Type',
				pageLink: 'type-of-application'
			},
			{
				value: crownDevelopment.ApplicantContact?.orgName,
				errorMessage: 'Enter Applicant Organisation Contact Name',
				pageLink: 'applicant-contact'
			},
			{
				value: crownDevelopment.Lpa?.id,
				errorMessage: 'Enter Local Planning Authority',
				pageLink: 'local-planning-authority'
			}
		];

		const errors = [];
		for (const answer of answers) {
			if (!answer.value) {
				errors.push({
					text: answer.errorMessage,
					href: `/cases/${id}/overview/${answer.pageLink}`
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

	clearSessionData(req, id, ['reference', 'casePublished']);
	res.render('views/cases/view/publish/success.njk', {
		title: 'Case Successfully Published',
		bodyText: `Case reference <br><strong>${reference}</strong>`,
		successBackLinkUrl: `/cases/${id}`,
		successBackLinkText: 'Back to overview'
	});
}
