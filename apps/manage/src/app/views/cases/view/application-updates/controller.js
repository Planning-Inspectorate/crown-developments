import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';
import { getAnswers } from '@pins/crowndev-lib/util/answers.js';
import { clearAppUpdateStatusSession, readAppUpdateStatus, validateParams } from './utils.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';

export function buildApplicationUpdates({ db }) {
	return async (req, res) => {
		const id = req.params?.id;
		if (!id) {
			throw new Error('id param required');
		}

		const crownDevelopment = await db.crownDevelopment.findUnique({
			where: { id },
			select: { reference: true }
		});

		if (!crownDevelopment) {
			return notFoundHandler(req, res);
		}

		const { selectedItemsPerPage, pageNumber, pageSize, skipSize } = getPaginationParams(req);

		const [applicationUpdates, totalApplicationUpdates] = await Promise.all([
			db.applicationUpdate.findMany({
				where: {
					applicationId: id
				},
				include: {
					Status: true
				},
				skip: skipSize,
				take: pageSize
			}),
			db.applicationUpdate.count({
				where: {
					applicationId: id
				}
			})
		]);

		if ([null, undefined].includes(totalApplicationUpdates) || Number.isNaN(totalApplicationUpdates)) {
			return notFoundHandler(req, res);
		}

		const { totalPages, resultsStartNumber, resultsEndNumber } = getPageData(
			totalApplicationUpdates,
			selectedItemsPerPage,
			pageSize,
			pageNumber
		);

		const applicationUpdateStatus = readAppUpdateStatus(req, id);
		clearAppUpdateStatusSession(req, id);

		res.render('views/cases/view/application-updates/view.njk', {
			pageTitle: 'Manage application updates',
			pageCaption: crownDevelopment.reference,
			backLinkUrl: `/cases/${id}`,
			baseUrl: req.baseUrl,
			currentUrl: req.originalUrl,
			applicationUpdates: applicationUpdates.map(applicationUpdateToViewModel),
			applicationUpdateStatus,
			selectedItemsPerPage,
			totalApplicationUpdates,
			pageNumber,
			totalPages,
			resultsStartNumber,
			resultsEndNumber
		});
	};
}

export function buildConfirmationController({ db }) {
	return async (req, res) => {
		const { id, applicationUpdateId } = validateParams(req.params);

		const [crownDevelopment, applicationUpdate] = await Promise.all([
			db.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			}),
			db.applicationUpdate.findUnique({
				where: { id: applicationUpdateId },
				select: { statusId: true, details: true }
			})
		]);

		if (!crownDevelopment || !applicationUpdate) {
			return notFoundHandler(req, res);
		}

		const applicationUpdateStatus = applicationUpdate.statusId;
		const applicationUpdateIsDraft = applicationUpdateStatus === APPLICATION_UPDATE_STATUS_ID.DRAFT;

		res.render('views/cases/view/application-updates/confirmation.njk', {
			pageTitle: `Confirm ${applicationUpdateIsDraft ? 'delete' : 'unpublish'} update`,
			pageCaption: crownDevelopment.reference,
			updateDetails: applicationUpdate.details,
			backLinkUrl: `${req.baseUrl}/${applicationUpdateId}/review-published`,
			submitButtonText: `Confirm ${applicationUpdateIsDraft ? 'delete' : 'unpublish'}`,
			cancelButtonUrl: req.baseUrl,
			applicationUpdateIsDraft
		});
	};
}

export function getSummaryHeading(res) {
	const answers = getAnswers(res);
	return answers?.publishNow === 'yes' ? 'Review update' : 'Review draft update';
}

function applicationUpdateToViewModel(applicationUpdate) {
	return {
		id: applicationUpdate.id,
		details: applicationUpdate.details,
		status: applicationUpdate.statusId,
		firstPublished: applicationUpdate.firstPublished
			? formatDateForDisplay(applicationUpdate.firstPublished, { format: 'd MMMM yyyy' })
			: 'Not published'
	};
}
