import type { S62APortalService } from '#service';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import {
	applicationLinks,
	representationToViewModel,
	type RepresentationWithContacts
} from '@pins/crowndev-lib/util/shared-view-model.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from '../view-model.ts';
import { representationMessages } from './view-model.ts';
import { tabText } from '../view-model.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { createPaginationParams, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { CASE_DATA_MODEL } from '@pins/crowndev-lib/util/types.ts';

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
			tabText,
			CASE_DATA_MODEL.S62A
		);

		const reference = s62aFields.reference;

		const { pageSize, skipSize } = getPaginationParams(req);

		const isPublishWrittenRepDateValid =
			Boolean(s62aCase.representationsPublishDate) && s62aCase.representationsPublishDate! <= new Date();

		let representations: RepresentationWithContacts[];
		let totalAcceptedRepresentations: number;
		let totalRepresentations: number;
		try {
			[representations, totalAcceptedRepresentations, totalRepresentations] = await Promise.all([
				isPublishWrittenRepDateValid
					? db.s62aRepresentation.findMany({
							where: {
								applicationId: id,
								statusId: REPRESENTATION_STATUS_ID.ACCEPTED
							},
							select: {
								reference: true,
								submittedDate: true,
								comment: true,
								commentRedacted: true,
								submittedByAgentOrgName: true,
								submittedForId: true,
								representedTypeId: true,
								representedGroupName: true,
								withholdName: true,
								containsAttachments: true,
								distressingContentInRepresentation: true,
								SubmittedFor: { select: { displayName: true } },
								SubmittedByContact: { select: { firstName: true, lastName: true } },
								RepresentedContacts: { select: { orgName: true, firstName: true, lastName: true } },
								Category: { select: { displayName: true } },
								Attachments: { select: { statusId: true } }
							},
							orderBy: { submittedDate: 'desc' },
							skip: skipSize,
							take: pageSize
						})
					: Promise.resolve([]),
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
			throw error;
		}

		const acceptedReps = !!totalAcceptedRepresentations;
		const reps = !!totalRepresentations;
		const representationMessage =
			representations.length > 0 ? [] : representationMessages(s62aCase, acceptedReps, reps);

		const paginationParams = createPaginationParams(req, totalRepresentations);

		return res.render('views/applications/view/written-representations/view.njk', {
			pageCaption: reference,
			pageTitle: 'Written representations',
			applicationReference: reference,
			representations: representations.map((representation) =>
				representationToViewModel(representation, true, {
					showWithheldNameAsInterestedParty: true,
					listS62aGroupParticipants: true
				})
			),
			representationMessage,
			links,
			paginationParams,
			currentUrl: req.originalUrl,
			s62aFields
		});
	};
}
