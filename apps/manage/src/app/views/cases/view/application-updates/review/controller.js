import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function buildReviewController({ db }) {
	return async (req, res) => {
		const id = req.params?.id;
		const applicationUpdateId = req.params?.updateId;
		if (!id) {
			throw new Error('id param required');
		}

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

		res.render('views/cases/view/application-updates/review/review.njk/', {
			pageTitle: `Review ${applicationUpdate.statusId} update`,
			pageCaption: crownDevelopment.reference,
			backLinkUrl: req.baseUrl,
			unpublishButtonUrl: `${req.baseUrl}/${applicationUpdateId}/unpublish`,
			applicationUpdateStatus: applicationUpdate.statusId,
			summaryItems: getSummaryListItems(applicationUpdate)
		});
	};
}

function getSummaryListItems(applicationUpdate) {
	const summaryListMap = {
		updateDetails: {
			key: {
				text: 'Update details'
			},
			value: {
				text: applicationUpdate.details
			},
			actions: applicationUpdate.statusId !== APPLICATION_UPDATE_STATUS_ID.UNPUBLISHED && {
				items: [
					{
						href: '',
						text: 'Change',
						visuallyHiddenText: 'details'
					}
				]
			}
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
						href: '',
						text: 'Change',
						visuallyHiddenText: 'details'
					}
				]
			}
		}
	};

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
