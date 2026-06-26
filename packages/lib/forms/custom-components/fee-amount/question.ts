import MonetaryInputQuestion from '../monetary-input/question.ts';
import type { CrownCommonQuestionProps, CUSTOM_COMPONENTS } from '../index.ts';

export type FeeAmountQuestionProps = CrownCommonQuestionProps & {
	type: typeof CUSTOM_COMPONENTS.FEE_AMOUNT;
	feeAmountInputFieldName: string;
	feeAmountQuestion: string;
};

export default class FeeAmountQuestion extends MonetaryInputQuestion {
	constructor(props: FeeAmountQuestionProps) {
		super({
			...props,
			conditionalAmountFieldName: props.feeAmountInputFieldName,
			conditionalAmountQuestion: props.feeAmountQuestion
		});
	}
}
