import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.js';

export function buildConfirmUnpublishCase({ db, logger }) {
	return async (req, res) => {
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}
		logger.info({ id }, 'unpublish case');
		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id }
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const reference = crownDevelopment.reference;

		res.render('views/cases/view/unpublish/confirm.njk', {
			reference,
			backLinkText: 'Back to Overview',
			backLinkUrl: `/cases/${id}`
		});
	};
}

export function buildSubmitUnpublishCase({ db, logger }) {
	return async (req, res) => {
		/** @type {string} */
		const id = req.params.id;

		if (!id) {
			throw new Error('id param required');
		}
		logger.info({ id }, 'unpublish case');
		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id }
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}
		try {
			await db.crownDevelopment.update({
				where: { id },
				data: {
					publishDate: null
				}
			});
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'unpublishing case',
				logParams: { id }
			});
		}
		addSessionData(req, id, { reference: crownDevelopment.reference, caseUnpublished: true });
		res.redirect(`/cases/${id}/unpublish/success`);
	};
}

export async function unpublishSuccessfulController(req, res) {
	const id = req.params.id;
	if (!id) {
		throw new Error('id param required');
	}

	const reference = readSessionData(req, id, 'reference');
	const caseUnpublished = readSessionData(req, id, 'caseUnpublished');
	if (!caseUnpublished || !reference) {
		throw new Error('invalid publish case session');
	}

	clearSessionData(req, id, ['reference', 'caseUnpublished']);
	res.render('views/cases/view/unpublish/success.njk', {
		title: 'Case Successfully Unpublished',
		bodyText: `Case reference <br><strong>${reference}</strong>`,
		backLinkUrl: `/cases/${id}`,
		backLinkText: 'Back to overview'
	});
}
