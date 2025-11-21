import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { addSessionData } from '@pins/crowndev-lib/util/session.js';
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
		return res.redirect(`/cases/${id}?success=published`);
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
				Lpa: { include: { Address: true } },
				SiteAddress: true
			}
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const answers = [
			{
				value: crownDevelopment.description,
				errorMessage: 'Enter Development Description',
				pageLink: `/cases/${id}/overview/development-description`
			},
			{
				value: crownDevelopment.typeId,
				errorMessage: 'Enter Application Type',
				pageLink: `/cases/${id}/overview/type-of-application`
			},
			{
				value: crownDevelopment.ApplicantContact?.orgName,
				errorMessage: 'Enter Applicant Organisation Contact Name',
				pageLink: `/cases/${id}/overview/applicant-contact`
			},
			{
				value: crownDevelopment.Lpa?.id,
				errorMessage: 'Enter Local Planning Authority',
				pageLink: `/cases/${id}/overview/local-planning-authority`
			},
			{
				value:
					crownDevelopment.SiteAddress?.postcode || (crownDevelopment.siteEasting && crownDevelopment.siteNorthing),
				errorMessage: 'You must enter site coordinates or postcode within the site address',
				pageLink: `/cases/${id}#overview`
			}
		];

		const errors = [];
		for (const answer of answers) {
			if (!answer.value) {
				errors.push({
					text: answer.errorMessage,
					href: answer.pageLink
				});
			}
		}

		if (errors.length > 0) {
			addSessionData(req, id, { publishErrors: errors });
			return res.redirect(`/cases/${id}`);
		}
		return next();
	};
}
