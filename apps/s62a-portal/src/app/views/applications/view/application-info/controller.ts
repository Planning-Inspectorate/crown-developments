import type { S62APortalService } from '#service';
import { fetchPublishedS62aApplication } from '@pins/crowndev-lib/util/applications.ts';
import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { s62aCaseToViewModel, type S62aCaseWithRelations } from './view-model.ts';
import { getAboutThisApplicationSectionItems } from './section-items.ts';

export function buildApplicationInformationPage(service: S62APortalService): AsyncRequestHandler {
	const { db } = service;
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
					S62aDates: true,
					Type: true,
					Lpa: true,
					SecondaryLpa: true,
					S62aToApplicants: {
						include: {
							Organisation: true,
							Contact: true
						}
					},
					ApplicantType: true,
					SiteAddress: true,
					Procedure: true
				}
			}
		});

		if (!s62aCase) {
			return notFoundHandler(req, res);
		}

		// We cast here because we know it will include a S62aDates join
		const s62aFields = s62aCaseToViewModel(s62aCase as S62aCaseWithRelations);

		const applicationStatus = s62aFields.applicationStatus;

		const links = applicationLinks(id, { start: null, end: null }, null, false, applicationStatus);

		const reference = s62aFields.reference;

		return res.render('views/applications/view/application-info/view.njk', {
			pageCaption: reference,
			pageTitle: 'Application information',
			applicationReference: reference,
			aboutThisApplicationSectionItems: getAboutThisApplicationSectionItems(s62aFields),
			links,
			currentUrl: req.originalUrl,
			s62aFields
		});
	};
}
