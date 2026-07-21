import type { DateFilterInput } from '@pins/crowndev-lib/filters/date-filter.ts';

type FilterSectionLike = {
	title?: string;
	type?: string;
	dateInputs?: DateFilterInput[];
};

type ErrorSummaryItem = {
	text: string;
	href: string;
};

type FormType = 'desktop' | 'mobile';

type MapDateFilterErrorSummaryOptions = {
	sectionTitle: string;
	getHref?: (dateInput: DateFilterInput, formType: FormType) => string;
	requireDateInputType?: boolean;
};

type MapDateFilterErrorSummaryArgs = {
	filters?: FilterSectionLike[];
	formType?: FormType;
} & MapDateFilterErrorSummaryOptions;

export function mapDateFilterErrorSummary({
	filters = [],
	formType = 'desktop',
	sectionTitle,
	getHref = (dateInput, ft) => {
		const suffix = ft === 'mobile' ? '-mobile' : '';
		return `#${dateInput.idPrefix}${suffix}-day`;
	},
	requireDateInputType = false
}: MapDateFilterErrorSummaryArgs): ErrorSummaryItem[] {
	const errorSummary: ErrorSummaryItem[] = [];

	filters.forEach((section) => {
		const isMatchingTitle = section?.title === sectionTitle;
		const isMatchingType = !requireDateInputType || section?.type === 'date-input';

		if (isMatchingTitle && isMatchingType && Array.isArray(section.dateInputs)) {
			section.dateInputs.forEach((dateInput) => {
				const errText = dateInput?.errorMessage?.text;
				if (errText) {
					errorSummary.push({
						text: errText,
						href: getHref(dateInput, formType)
					});
				}
			});
		}
	});

	return errorSummary;
}
