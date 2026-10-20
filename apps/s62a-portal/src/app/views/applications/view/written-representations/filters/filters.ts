import { REPRESENTATION_CATEGORY_ID, REPRESENTATION_STATUS_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { buildDateFilterSection, sanitiseQueryToStringArray } from '@pins/crowndev-lib/filters/filter-utils.ts';
import type { Service } from '@pins/crowndev-lib/app/base-service.ts';
import type { CheckboxFilter, FilterSection, QueryFilters } from '@pins/crowndev-lib/filters/filter-types.ts';

export async function buildFilters(
	{ db, logger }: Pick<Service, 'db' | 'logger'>,
	id: string,
	queryFilters: QueryFilters
): Promise<FilterSection[]> {
	const interestedParties = REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES;
	const consultees = REPRESENTATION_CATEGORY_ID.CONSULTEES;
	try {
		const [interestedPartyCount, consulteeCount, withAttachmentsCount, withoutAttachmentsCount] = await Promise.all([
			db.s62aRepresentation.count({
				where: { categoryId: interestedParties, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.s62aRepresentation.count({
				where: { categoryId: consultees, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.s62aRepresentation.count({
				where: { containsAttachments: true, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			}),
			db.s62aRepresentation.count({
				where: { containsAttachments: false, applicationId: id, statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
			})
		]);

		const normalizeToArray = (value: unknown): string[] =>
			[value].flat(1).filter((v): v is string => typeof v === 'string' && true);

		const submittedByArray = normalizeToArray(queryFilters?.filterSubmittedBy);
		const attachmentsArray = normalizeToArray(queryFilters?.filterByAttachments);

		const submittedBySection: CheckboxFilter = {
			title: 'Submitted by',
			type: 'checkboxes',
			name: 'filterSubmittedBy',
			options: {
				items: [
					{
						displayName: 'Interested Party',
						text: `Interested party (${interestedPartyCount})`,
						value: interestedParties,
						checked: sanitiseQueryToStringArray(queryFilters?.filterSubmittedBy).includes(interestedParties) || false
					},
					{
						displayName: 'Consultee',
						text: `Consultee (${consulteeCount})`,
						value: consultees,
						checked: sanitiseQueryToStringArray(queryFilters?.filterSubmittedBy).includes(consultees) || false
					}
				]
			},
			open: submittedByArray.some(Boolean)
		};

		const attachmentsSection: CheckboxFilter = {
			title: 'Contains attachments',
			name: 'filterByAttachments',
			type: 'checkboxes',
			options: {
				items: [
					{
						displayName: 'Yes',
						text: `Yes (${withAttachmentsCount})`,
						value: 'withAttachments',
						checked: sanitiseQueryToStringArray(queryFilters?.filterByAttachments).includes('withAttachments') || false
					},
					{
						displayName: 'No',
						text: `No (${withoutAttachmentsCount})`,
						value: 'withoutAttachments',
						checked:
							sanitiseQueryToStringArray(queryFilters?.filterByAttachments).includes('withoutAttachments') || false
					}
				]
			},
			open: attachmentsArray.some(Boolean)
		};

		queryFilters = queryFilters || {};

		const dateSubmissionsSection = buildDateFilterSection({
			title: 'Date submitted',
			name: 'submittedDate',
			fromPrefix: 'submittedDateFrom',
			toPrefix: 'submittedDateTo',
			queryFilters,
			hintText: 'For example, 5 7 2022'
		});

		return [submittedBySection, attachmentsSection, dateSubmissionsSection];
	} catch (error) {
		wrapPrismaError({
			error,
			logger,
			message: 'fetching written representations',
			logParams: { id }
		});
		return [];
	}
}
