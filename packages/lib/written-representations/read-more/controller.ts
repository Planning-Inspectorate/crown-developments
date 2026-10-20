import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import { getApplicationStatus } from '@pins/crowndev-lib/util/applications.ts';
import { representationToViewModel } from '@pins/crowndev-lib/written-representations/view-model.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import type { RepresentationWithContacts } from '@pins/crowndev-lib/written-representations/view-model.ts';
import type { DocumentViewModel } from '@pins/crowndev-lib/documents/types.js';

type WrittenRepresentationsDevelopment = {
	reference: string;
	withdrawnDate?: Date | null;
	representationsPeriodStartDate: Date | null;
	representationsPeriodEndDate: Date | null;
	representationsPublishDate: Date | null;
	containsDistressingContent?: boolean | null;
};

/**
 * Render written representation read more page
 */
export function buildWrittenRepresentationsReadMorePage(
	development: WrittenRepresentationsDevelopment,
	representation: RepresentationWithContacts,
	representationReference: string,
	displayApplicationUpdates: boolean,
	documents: DocumentViewModel[] = []
): AsyncRequestHandler {
	return (req, res) => {
		const id = getStringParam(req.params, 'applicationId');
		if (!isValidUuidFormat(id)) {
			notFoundHandler(req, res);
			return Promise.resolve();
		}

		const haveYourSayPeriod = {
			start: development.representationsPeriodStartDate,
			end: development.representationsPeriodEndDate
		};
		const representationsPublishDate = development.representationsPublishDate;
		const applicationStatus = getApplicationStatus(development.withdrawnDate);
		const writtenRepresentationsUrl = req.originalUrl?.replace(`/${representationReference}`, '');

		res.render('read-more/view.njk', {
			pageCaption: development.reference,
			links: applicationLinks(
				id,
				haveYourSayPeriod,
				representationsPublishDate,
				displayApplicationUpdates,
				applicationStatus,
				undefined
			),
			currentUrl: writtenRepresentationsUrl,
			backLinkText: 'Back to list',
			backLinkUrl: writtenRepresentationsUrl,
			representationViewModel: representationToViewModel(representation),
			containsDistressingContent: development.containsDistressingContent || false,
			documents
		});
		return Promise.resolve();
	};
}
