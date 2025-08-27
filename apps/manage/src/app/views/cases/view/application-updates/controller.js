import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { JOURNEY_ID } from './journey.js';
import { APPLICATION_UPDATE_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';
import { clearDataFromSession } from '@planning-inspectorate/dynamic-forms/src/lib/session-answer-store.js';
import { formatDateForDisplay } from '@planning-inspectorate/dynamic-forms/src/lib/date-utils.js';
import { getPageData, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.js';
import { getAnswers } from '@pins/crowndev-lib/util/answers.js';

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

export function buildCreateController() {
	return async (req, res) => {
		res.redirect(`${req.baseUrl}/create/update-details`);
	};
}

export function buildSaveController({ db, logger }) {
	return async (req, res) => {
		const id = req.params?.id;
		if (!id) {
			throw new Error('id param required');
		}

		const answers = getAnswers(res);

		await db.$transaction(async ($tx) => {
			const crownDevelopment = await $tx.crownDevelopment.findUnique({
				where: { id },
				select: { reference: true }
			});
			const reference = crownDevelopment.reference;

			logger.info({ reference }, 'creating a new application update');

			const newApplicationUpdate = await $tx.applicationUpdate.create({
				data: toCreateInput(answers, id)
			});

			const newApplicationUpdateId = newApplicationUpdate.id;
			logger.info({ reference, newApplicationUpdateId }, 'created a new application update');
		});

		addAppUpdateStatus(req, id, answers.publishNow === 'yes' ? 'published' : 'saved');
		clearDataFromSession({ req, journeyId: JOURNEY_ID, reqParam: 'id' });

		res.redirect(req.baseUrl);
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

function toCreateInput(answers, id) {
	const now = new Date();
	const isPublishNow = answers.publishNow === 'yes';

	return {
		Application: { connect: { id } },
		details: answers.updateDetails,
		lastEdited: now,
		Status: {
			connect: {
				id: isPublishNow ? APPLICATION_UPDATE_STATUS_ID.PUBLISHED : APPLICATION_UPDATE_STATUS_ID.DRAFT
			}
		},
		...(isPublishNow && { firstPublished: now })
	};
}

function addAppUpdateStatus(req, id, reviewDecision) {
	addSessionData(req, id, { applicationUpdateStatus: reviewDecision });
}

function readAppUpdateStatus(req, id) {
	return readSessionData(req, id, 'applicationUpdateStatus', false);
}

function clearAppUpdateStatusSession(req, id) {
	clearSessionData(req, id, 'applicationUpdateStatus');
}
