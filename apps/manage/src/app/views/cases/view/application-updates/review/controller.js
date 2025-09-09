import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import {
	addAppUpdateStatus,
	clearAppUpdatesFromSession,
	getApplicationUpdateSessionData,
	validateParams
} from '../utils.js';
import { addSessionData } from '@pins/crowndev-lib/util/session.js';
import { expressValidationErrorsToGovUkErrorList } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { BOOLEAN_OPTIONS } from '@planning-inspectorate/dynamic-forms/src/components/boolean/question.js';

export function buildReviewController({ db }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const [crownDevelopment, applicationUpdate] = await Promise.all([
			db.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			}),
			db.applicationUpdate.findUnique({
				where: { id: applicationUpdateId, applicationId: id }
			})
		]);

		if (!crownDevelopment || !applicationUpdate) {
			return notFoundHandler(req, res);
		}

		const applicationUpdateSession = getApplicationUpdateSessionData(req, applicationUpdateId);

		if (Object.keys(applicationUpdateSession).length === 0) {
			addSessionData(
				req,
				applicationUpdateId,
				{
					details: applicationUpdate.details,
					publishNow:
						applicationUpdate.statusId === APPLICATION_UPDATE_STATUS_ID.PUBLISHED
							? BOOLEAN_OPTIONS.YES
							: BOOLEAN_OPTIONS.NO
				},
				'appUpdates'
			);
		}

		res.render('views/cases/view/application-updates/review/review.njk', {
			pageTitle: getReviewPageTitle(applicationUpdate.statusId, applicationUpdateSession.publishNow),
			backLinkUrl: req.baseUrl,
			unpublishButtonUrl: `${req.baseUrl}/${applicationUpdateId}/unpublish`,
			deleteButtonUrl: `${req.baseUrl}/${applicationUpdateId}/delete`,
			applicationUpdateStatus: applicationUpdate.statusId,
			summaryItems: getSummaryListItems({ ...applicationUpdate, ...applicationUpdateSession }, req.baseUrl)
		});
	};
}

export function buildSaveDraftUpdateController({ db, logger }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);
		const appUpdateSessionData = getApplicationUpdateSessionData(req, applicationUpdateId);

		await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference, applicationUpdateId }, 'updating application update');

			const now = new Date();
			const isPublishNow = appUpdateSessionData.publishNow === 'yes';

			await $tx.applicationUpdate.update({
				where: { id: applicationUpdateId, applicationId: id },
				data: {
					lastEdited: now,
					details: appUpdateSessionData.details,
					Status: {
						connect: {
							id: isPublishNow ? APPLICATION_UPDATE_STATUS_ID.PUBLISHED : APPLICATION_UPDATE_STATUS_ID.DRAFT
						}
					},
					...(isPublishNow && { firstPublished: now })
				}
			});

			logger.info({ reference, applicationUpdateId }, 'application update successfully updated');
		});

		addAppUpdateStatus(req, id, `Your update was ${appUpdateSessionData.publishNow === 'yes' ? 'published' : 'saved'}`);
		clearAppUpdatesFromSession(req, applicationUpdateId);

		res.redirect(req.baseUrl);
	};
}

export function buildUpdateDetailsPage({ db }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const applicationUpdate = await db.applicationUpdate.findUnique({
			where: { id: applicationUpdateId, applicationId: id },
			select: { statusId: true }
		});
		const applicationUpdateStatus = applicationUpdate.statusId;

		const appUpdateSessionData = getApplicationUpdateSessionData(req, applicationUpdateId);

		const backLinkUrlSuffix =
			applicationUpdateStatus === APPLICATION_UPDATE_STATUS_ID.PUBLISHED ? 'published' : 'update';

		res.render('views/cases/view/application-updates/review/update-details.njk', {
			applicationUpdateStatus,
			details: appUpdateSessionData.details,
			backLinkUrl: `${req.baseUrl}/${applicationUpdateId}/review-${backLinkUrlSuffix}`,
			errors: req.body?.errors,
			errorSummary: req.body?.errorSummary
		});
	};
}

export function buildSubmitUpdateDetails({ db, logger }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const updateDetailsValue = req.body.details;
		if (!updateDetailsValue || updateDetailsValue.length > 1000) {
			req.body.errors = {
				details: {
					msg: !updateDetailsValue ? 'Enter update details' : 'Update details must be 1000 characters or less'
				}
			};
			req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);

			updateAppUpdatesSession(req, applicationUpdateId, updateDetailsValue);

			const updateDetailsPage = buildUpdateDetailsPage({ db });
			return updateDetailsPage(req, res);
		}

		const applicationUpdate = await db.applicationUpdate.findUnique({
			where: { id: applicationUpdateId, applicationId: id },
			select: { statusId: true, details: true }
		});

		const applicationUpdateStatus = applicationUpdate.statusId;
		const isUpdatePublished = applicationUpdateStatus === APPLICATION_UPDATE_STATUS_ID.PUBLISHED;
		const isDetailsUpdated = applicationUpdate.details !== updateDetailsValue;

		if (isUpdatePublished) {
			if (isDetailsUpdated) {
				await db.$transaction(async ($tx) => {
					const crownDevelopment = await $tx.crownDevelopment.findUnique({
						where: { id },
						select: { reference: true }
					});
					const reference = crownDevelopment.reference;

					logger.info({ reference, applicationUpdateId }, 'updating application update');

					await db.applicationUpdate.update({
						where: { id: applicationUpdateId, applicationId: id },
						data: {
							lastEdited: new Date(),
							details: updateDetailsValue
						}
					});

					logger.info({ reference, applicationUpdateId }, 'application update successfully updated');
				});
			}

			addAppUpdateStatus(req, id, isDetailsUpdated ? 'Your update was published' : 'No changes made to the update');
			clearAppUpdatesFromSession(req, applicationUpdateId);

			res.redirect(req.baseUrl);
		} else {
			updateAppUpdatesSession(req, applicationUpdateId, updateDetailsValue);
			res.redirect(`${req.baseUrl}/${applicationUpdateId}/review/publish-now`);
		}
	};
}

export function buildPublishNowPage() {
	return async (req, res) => {
		const { applicationUpdateId } = validateParams(req.params);
		const appUpdateSessionData = getApplicationUpdateSessionData(req, applicationUpdateId);
		res.render('views/cases/view/application-updates/review/publish-now.njk', {
			backLinkUrl: `${req.baseUrl}/${applicationUpdateId}/review/update-details`,
			publishNow: appUpdateSessionData.publishNow || 'no'
		});
	};
}

export function buildSubmitPublishNow() {
	return async (req, res) => {
		const { applicationUpdateId } = validateParams(req.params);

		const publishNowValue = req.body.publishNow;
		const appUpdateSessionData = getApplicationUpdateSessionData(req, applicationUpdateId);
		const applicationUpdateSession = {
			...appUpdateSessionData,
			publishNow: publishNowValue
		};

		addSessionData(req, applicationUpdateId, applicationUpdateSession, 'appUpdates');

		res.redirect(`${req.baseUrl}/${applicationUpdateId}/review-update`);
	};
}

function getSummaryListItems(applicationUpdate, baseUrl) {
	const summaryListMap = getSummaryListMap(applicationUpdate, baseUrl);
	switch (applicationUpdate.statusId) {
		case APPLICATION_UPDATE_STATUS_ID.PUBLISHED:
			return [summaryListMap.updateDetails, summaryListMap.firstPublished, summaryListMap.lastEdited];
		case APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED:
			return [
				summaryListMap.updateDetails,
				summaryListMap.firstPublished,
				summaryListMap.unpublishedDate,
				summaryListMap.lastEdited
			];
		default:
			return [summaryListMap.updateDetails, summaryListMap.publishNow];
	}
}

function getSummaryListMap(applicationUpdate, baseUrl) {
	return {
		updateDetails: {
			key: {
				text: 'Update details'
			},
			value: {
				text: applicationUpdate.details
			},
			...(applicationUpdate.statusId !== APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED && {
				actions: {
					items: [
						{
							href: `${baseUrl}/${applicationUpdate.id}/review/update-details`,
							text: 'Change',
							visuallyHiddenText: 'details'
						}
					]
				}
			})
		},
		firstPublished: {
			key: {
				text: 'First published'
			},
			value: {
				text: formatDateForDisplay(applicationUpdate.firstPublished, { format: 'd MMMM yyyy' })
			}
		},
		lastEdited: {
			key: {
				text: 'Last edited'
			},
			value: {
				text: formatDateForDisplay(applicationUpdate.lastEdited, { format: 'd MMMM yyyy' })
			}
		},
		unpublishedDate: {
			key: {
				text: 'Date unpublished'
			},
			value: {
				text: formatDateForDisplay(applicationUpdate.unpublishedDate, { format: 'd MMMM yyyy' })
			}
		},
		publishNow: {
			key: {
				text: 'Publish now?'
			},
			value: {
				text: applicationUpdate.publishNow === BOOLEAN_OPTIONS.YES ? 'Yes' : 'No'
			},
			actions: {
				items: [
					{
						href: `${baseUrl}/${applicationUpdate.id}/review/publish-now`,
						text: 'Change',
						visuallyHiddenText: 'publish now'
					}
				]
			}
		}
	};
}

function getReviewPageTitle(currentUpdateStatusId, publishNow) {
	switch (currentUpdateStatusId) {
		case APPLICATION_UPDATE_STATUS_ID.PUBLISHED:
			return `Review ${currentUpdateStatusId} update`;
		case APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED:
			return `Review ${currentUpdateStatusId} update`;
		default:
			return publishNow === BOOLEAN_OPTIONS.YES ? 'Review update' : `Review ${currentUpdateStatusId} update`;
	}
}

function updateAppUpdatesSession(req, applicationUpdateId, updateDetailsValue) {
	const appUpdateSessionData = getApplicationUpdateSessionData(req, applicationUpdateId);

	const applicationUpdateSession = {
		...appUpdateSessionData,
		details: updateDetailsValue
	};

	addSessionData(req, applicationUpdateId, applicationUpdateSession, 'appUpdates');
}
