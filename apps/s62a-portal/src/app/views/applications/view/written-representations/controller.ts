import type { S62APortalService } from '#service';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import type { RepresentationWithContacts } from '@pins/crowndev-lib/written-representations/view-model.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from '../view-model.ts';
import { tabText } from '../view-model.ts';
import { REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { buildWrittenRepresentationsPage } from '@pins/crowndev-lib/written-representations/controller.ts';

export function buildS62AWrittenRepresentationsPage(service: S62APortalService): AsyncRequestHandler {
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
		const caseFields = s62aCaseToViewModel(s62aCase as S62aCaseWithRelations);

		const { pageSize, skipSize } = getPaginationParams(req);

		const publishDate = s62aCase?.representationsPublishDate;
		const isPublishWrittenRepDateValid = publishDate != null && publishDate <= new Date();

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

		return buildWrittenRepresentationsPage(
			caseFields,
			representations,
			totalAcceptedRepresentations,
			totalRepresentations,
			tabText
		)(req, res);
	};
}
