import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { validateParams } from '../utils.js';

export function buildReviewController({ db }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const [crownDevelopment, applicationUpdate] = await Promise.all([
			db.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			}),
			db.applicationUpdate.findUnique({
				where: { id: applicationUpdateId }
			})
		]);

		if (!crownDevelopment || !applicationUpdate) {
			return notFoundHandler(req, res);
		}

		res.render('views/cases/view/application-updates/review/review.njk', {
			pageTitle: `Review ${applicationUpdate.statusId} update`,
			pageCaption: crownDevelopment.reference,
			backLinkUrl: req.baseUrl,
			unpublishButtonUrl: `${req.baseUrl}/${applicationUpdateId}/unpublish`,
			deleteButtonUrl: `${req.baseUrl}/${applicationUpdateId}/delete`,
			applicationUpdateStatus: applicationUpdate.statusId,
			summaryItems: getSummaryListItems(applicationUpdate)
		});
	};
}

export function buildSaveDraftUpdateController({ db, logger }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference, applicationUpdateId }, 'updating draft application update');

			// TODO: save changes to the db as part of CROWN-1050, CROWN-1066, CROWN-1067

			logger.info({ reference, applicationUpdateId }, 'created a new application update');
		});
		res.redirect(req.baseUrl);
	};
}

function getSummaryListItems(applicationUpdate) {
	const summaryListMap = getSummaryListMap(applicationUpdate);
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

function getSummaryListMap(applicationUpdate) {
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
							href: '', // TODO: update as part of CROWN-1066
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
				text: 'No'
			},
			actions: {
				items: [
					{
						href: '', //TODO: update as part of CROWN-1067
						text: 'Change',
						visuallyHiddenText: 'publish now'
					}
				]
			}
		}
	};
}
