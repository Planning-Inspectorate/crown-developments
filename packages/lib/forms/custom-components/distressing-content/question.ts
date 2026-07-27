import { BooleanQuestion } from '@planning-inspectorate/dynamic-forms';
import type { Journey, ActionView, BooleanQuestionParams } from '@planning-inspectorate/dynamic-forms';
import type { CUSTOM_COMPONENTS } from '../index.ts';

type ActionLink = Omit<ActionView, 'visuallyHiddenText'>;

export type DistressingContentQuestionProps = DistressingContentQuestionParams & {
	type: typeof CUSTOM_COMPONENTS.DISTRESSING_CONTENT;
};
export type DistressingContentQuestionParams = BooleanQuestionParams & {
	actionLink?: ActionLink;
};

/**
 * Custom Boolean Question that supports actionLink override
 * This allows the question to show a "Manage" link instead of "Edit" when configured
 */
export default class DistressingContentQuestion extends BooleanQuestion {
	constructor({ actionLink, ...params }: DistressingContentQuestionParams) {
		super(params);
		this.actionLink = actionLink;
	}

	/**
	 * Override getAction to use actionLink if provided
	 */
	override getAction(sectionSegment: string, journey: Journey, answer: unknown): ActionView | ActionView[] | undefined {
		if (this.actionLink) {
			return {
				href: this.actionLink.href,
				text: this.actionLink.text,
				visuallyHiddenText: this.question
			};
		}

		// Otherwise, fall back to default behaviour
		return super.getAction(sectionSegment, journey, answer);
	}
}
