import type { S62APortalService } from '#service';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from '../view-model.ts';
import { representationMessages } from './view-model.ts';
import { tabText } from '../view-model.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';

export function buildWrittenRepresentationsPage(service: S62APortalService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const id = getStringParam(req.params, 'applicationId');

		if (!isValidUuidFormat(id)) {
			return notFoundHandler(req, res);
		}

		const s62aCase = await fetchPublishedS62aApplication({
			id,
			db,
			args: {
				include: {
					S62aDates: true
				}
			}
		});

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		// We cast here because we know it will include a S62aDates join
		const s62aFields = s62aCaseToViewModel(s62aCase as S62aCaseWithRelations);

		const applicationStatus = s62aFields.applicationStatus;
		const representationPublishDate = s62aCase.representationsPublishDate;

		const links = applicationLinks(
			id,
			{ start: null, end: null },
			representationPublishDate,
			false,
			applicationStatus,
			tabText
		);

		const reference = s62aFields.reference;

		let totalAcceptedRepresentations, totalRepresentations;
		try {
			[totalAcceptedRepresentations, totalRepresentations] = await Promise.all([
				db.s62aRepresentation.count({
					where: {
						applicationId: id,
						statusId: REPRESENTATION_STATUS_ID.ACCEPTED
					}
				}),
				db.s62aRepresentation.count({
					where: {
						applicationId: id
					}
				})
			]);
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'fetching written representations',
				logParams: { id }
			});
		}

		const acceptedReps = !!totalAcceptedRepresentations;
		const reps = !!totalRepresentations;
		const representationMessage = representationMessages(s62aCase, acceptedReps, reps);

		return res.render('views/applications/view/written-representations/view.njk', {
			pageCaption: reference,
			pageTitle: 'Written representations',
			applicationReference: reference,
			representationMessage,
			links,
			currentUrl: req.originalUrl,
			s62aFields
		});
	};
}
