import { DateTimeQuestion } from '@planning-inspectorate/dynamic-forms';

export type DateTimeWithHintQuestionParams = ConstructorParameters<typeof DateTimeQuestion>[0];

/**
 * The dynamic-forms date and time question, with a template that also shows the question's
 * hint and the warning text (viewData.warningMessage). The dynamic-forms date-time template
 * (v5) shows neither.
 */
export default class DateTimeWithHintQuestion extends DateTimeQuestion {
	constructor(params: DateTimeWithHintQuestionParams) {
		super(params);
		this.viewFolder = 'custom-components/date-time-with-hint';
	}
}
