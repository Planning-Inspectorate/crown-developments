import RepresentationComment from './representation-comment/question.js';
import FeeAmount from './fee-amount/question.js';

/**
 * @type {Readonly<{REPRESENTATION_COMMENT: string}>}
 */
export const CUSTOM_COMPONENTS = Object.freeze({
	REPRESENTATION_COMMENT: 'representation-comment',
	FEE_AMOUNT: 'fee-amount'
});

/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question.js').Question>} */
export const CUSTOM_COMPONENT_CLASSES = Object.freeze({
	[CUSTOM_COMPONENTS.REPRESENTATION_COMMENT]: RepresentationComment,
	[CUSTOM_COMPONENTS.FEE_AMOUNT]: FeeAmount
});
