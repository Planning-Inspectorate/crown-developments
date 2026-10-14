import { notFoundHandler } from '@planning-inspectorate/core/middleware';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { isValidUuidFormat } from '@pins/crowndev-lib/util/uuid.ts';
import { applicationLinks } from '@pins/crowndev-lib/util/shared-view-model.ts';
import {
	representationMessages,
	representationToViewModel,
	type RepresentationWithContacts,
	type WrittenRepresentationsCaseFields
} from './view-model.ts';
import { createPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';

export function buildWrittenRepresentationsPage(
	caseFields: WrittenRepresentationsCaseFields,
	representations: RepresentationWithContacts[],
	totalAcceptedRepresentations: number,
	totalRepresentations: number,
	tabText: Record<string, string>
): AsyncRequestHandler {
	return (req, res) => {
		const id = getStringParam(req.params, 'applicationId');

		if (!isValidUuidFormat(id)) {
			notFoundHandler(req, res);
			return Promise.resolve();
		}

		if (!caseFields) {
			notFoundHandler(req, res);
			return Promise.resolve();
		}

		const applicationStatus = caseFields.applicationStatus;
		const representationPublishDate = caseFields.representationsPublishDate;

		const links = applicationLinks(
			id,
			{ start: null, end: null },
			representationPublishDate,
			false,
			applicationStatus,
			tabText
		);

		const reference = caseFields.reference;

		const acceptedReps = !!totalAcceptedRepresentations;
		const reps = !!totalRepresentations;
		const representationMessage =
			representations.length > 0 ? [] : representationMessages(caseFields, acceptedReps, reps);

		const paginationParams = createPaginationParams(req, totalAcceptedRepresentations);

		res.render('./view.njk', {
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
			caseFields
		});
		return Promise.resolve();
	};
}
