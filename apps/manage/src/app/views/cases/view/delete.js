const questionConfig = {
	'check-agent-contact-details': {
		fieldName: 'manageAgentContactDetails',
		successMessage: 'Contact removed'
	},
	'check-applicant-contact-details': {
		fieldName: 'manageApplicantContactDetails',
		successMessage: 'Contact removed'
	},
	'check-applicant-details': {
		fieldName: 'manageApplicantDetails',
		successMessage: 'Organisation removed'
	}
};

/**
 * @param {string} questionUrl
 * @returns {string}
 */
const buildSuccessBannerMessageKey = (questionUrl) => `${questionUrl}:item-removed-success`;

/**
 * Mark a banner message as present for a given question URL.
 *
 * @param {import('express').Request} req
 * @param {string} questionUrl
 */
const setBannerMessage = (req, questionUrl) => {
	if (!req?.session) return;
	req.session.bannerMessage = req.session.bannerMessage || {};
	req.session.bannerMessage[buildSuccessBannerMessageKey(questionUrl)] = true;
};

const questionsWithDeleteSuccessBanner = new Set(Object.keys(questionConfig));

/**
 * Map question URL to success message
 * @type {Record<string, string>}
 */
const questionUrlToSuccessMessage = Object.fromEntries(
	Object.entries(questionConfig).map(([questionUrl, cfg]) => [questionUrl, cfg.successMessage])
);

/**
 * Middleware to add a success banner after confirming deletion of a manage-list item, where the deletion was successful.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function addSuccessBannerFromMessage(req, res, next) {
	try {
		const { question } = req.params;
		if (!question || typeof question !== 'string') return next();
		if (!questionsWithDeleteSuccessBanner.has(question)) return next();
		if (!req?.session) return next();
		const bannerMessageKey = buildSuccessBannerMessageKey(question);
		if (req.session.bannerMessage?.[bannerMessageKey]) {
			res.locals.notificationBannerSuccess = questionUrlToSuccessMessage[question] || 'Item removed';
			delete req.session.bannerMessage[bannerMessageKey];
		}
		return next();
	} catch (e) {
		return next(e);
	}
}

/**
 * Delete DB-backed manage-list items immediately when remove is confirmed.
 *
 * dynamic-forms stores answers in session and (for manage-lists) will remove the item
 * from the session array. However, for the view journey we re-hydrate answers from the DB
 * on each request, so we also need to delete the item from the DB at confirm time.
 *
 * This middleware runs ahead of the normal dynamic-forms save-to-session handler.
 *
 * @param {import('#service').ManageService} service
 * @returns {import('express').Handler}
 */
export function buildDeleteManageListItemOnConfirmRemove(service) {
	const { db, logger } = service;
	/**
	 * dynamic-forms routes use the question URL segment (Question#url) not the Question#fieldName.
	 * For delete handling we key off fieldName, so we need a small mapping.
	 *
	 * @type {Record<string, string>}
	 */
	const questionUrlToFieldName = Object.fromEntries(
		Object.entries(questionConfig).map(([questionUrl, cfg]) => [questionUrl, cfg.fieldName])
	);

	/**
	 * @typedef DeleteHandlerArgs
	 * @property {import('express').Request} req
	 * @property {string} id
	 * @property {string} manageListItemId
	 */
	/** @type {Record<string, (args: DeleteHandlerArgs) => Promise<void>>} */
	const deleteHandlersByFieldName = {
		// Applicants: session item id is Organisation.id; remove relationship record for this case
		manageApplicantDetails: async ({ req, id, manageListItemId }) => {
			// Fetch linked contacts up-front (we may attempt to clean them up later)
			const contacts = await db.organisationToContact.findMany({
				where: {
					organisationId: manageListItemId,
					Organisation: {
						CrownDevelopmentToOrganisation: {
							some: { crownDevelopmentId: id }
						}
					}
				},
				select: { contactId: true }
			});
			logger.info({ contacts }, 'contacts to delete');

			try {
				await db.$transaction([
					// 1) remove contact join rows for this organisation first (prevents foreign key failures)
					db.organisationToContact.deleteMany({
						where: { organisationId: manageListItemId }
					}),
					// 2) remove relationship to this case
					db.crownDevelopmentToOrganisation.deleteMany({
						where: { crownDevelopmentId: id, organisationId: manageListItemId }
					}),
					// 3) remove the organisation row (may still fail if referenced elsewhere)
					db.organisation.delete({ where: { id: manageListItemId } })
				]);
				setBannerMessage(req, 'check-applicant-details');
			} catch (error) {
				logger?.warn?.(
					{ id, manageListItemId, err: error },
					'Unable to delete Organisation record (may still be referenced)'
				);
			}

			// Best-effort cleanup of contacts (only safe if contacts are not shared elsewhere)
			const contactIds = contacts.map((c) => c.contactId);
			if (contactIds.length) {
				try {
					await db.contact.deleteMany({
						where: { id: { in: contactIds } }
					});
				} catch (error) {
					logger?.warn?.(
						{ id, manageListItemId, err: error },
						'Unable to delete contact record linked to organisation.'
					);
				}
			}
		},
		// Applicant contacts: session item id is Contact.id; remove join rows across the organisations for this case
		manageApplicantContactDetails: async ({ req, id, manageListItemId }) => {
			// 1) remove join rows for this case
			await db.organisationToContact.deleteMany({
				where: {
					contactId: manageListItemId,
					Organisation: {
						CrownDevelopmentToOrganisation: {
							some: { crownDevelopmentId: id }
						}
					}
				}
			});
			// 2) remove the contact row (may fail if the contact is still referenced elsewhere)
			try {
				await db.contact.delete({ where: { id: manageListItemId } });
				setBannerMessage(req, 'check-applicant-contact-details');
			} catch (error) {
				logger?.warn?.(
					{ id, manageListItemId, err: error },
					'Unable to delete Contact record (may still be referenced)'
				);
			}
		},
		// Agent contacts: session item id is Contact.id; remove join rows for the agent organisation on this case
		manageAgentContactDetails: async ({ req, id, manageListItemId }) => {
			await db.organisationToContact.deleteMany({
				where: {
					contactId: manageListItemId,
					Organisation: {
						CrownDevelopmentToOrganisation: {
							some: { crownDevelopmentId: id }
						}
					}
				}
			});
			// 2) remove the contact row (may fail if the contact is still referenced elsewhere)
			try {
				await db.contact.delete({ where: { id: manageListItemId } });
				// success banner for next GET of the parent question page
				setBannerMessage(req, 'check-agent-contact-details');
			} catch (error) {
				logger?.warn?.(
					{ id, manageListItemId, err: error },
					'Unable to delete Contact record (may still be referenced)'
				);
			}
		}
	};

	return async (req, res, next) => {
		try {
			const { manageListAction, manageListItemId, manageListQuestion, question, id } = req.params;
			if (
				typeof manageListAction !== 'string' ||
				typeof manageListItemId !== 'string' ||
				typeof manageListQuestion !== 'string' ||
				typeof question !== 'string'
			) {
				return next();
			}
			// Only act on the remove-confirm step (manageListQuestion is the step url, e.g. "confirm")
			if (manageListAction !== 'remove' || manageListQuestion !== 'confirm' || !manageListItemId) {
				return next();
			}
			if (!id || typeof id !== 'string') {
				return next();
			}
			const fieldName = questionUrlToFieldName[question] || question;
			// The DB-backed list is identified by the parent question (mapped to fieldName)
			const deleteHandler = deleteHandlersByFieldName[fieldName];
			if (!deleteHandler) {
				logger?.warn?.(
					{ id, manageListAction, manageListItemId, manageListQuestion, fieldName },
					'No manage-list delete handler configured'
				);
				return next();
			}

			logger?.info?.({ id, manageListQuestion, manageListItemId, fieldName }, 'Deleting manage-list item from DB');
			await deleteHandler({ req, id, manageListItemId });

			return next();
		} catch (error) {
			return next(error);
		}
	};
}
