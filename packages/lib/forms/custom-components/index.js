import RepresentationComment from './representation-comment/question.js';
import FeeAmountQuestion from './fee-amount/question.js';
import RepresentationAttachments from './representation-attachments/question.js';
import CILAmountQuestion from './cil-amount/question.js';
import CostsApplicationsCommentQuestion from './costs-applications-comment/question.js';

/**
 * @type {Readonly<{REPRESENTATION_COMMENT: string}>}
 */
export const CUSTOM_COMPONENTS = Object.freeze({
	REPRESENTATION_ATTACHMENTS: 'representation-attachments',
	REPRESENTATION_COMMENT: 'representation-comment',
	FEE_AMOUNT: 'fee-amount',
	CIL_AMOUNT: 'cil-amount',
	COSTS_APPLICATIONS: 'costs-applications'
});

/** @type {Record<string, import('@planning-inspectorate/dynamic-forms/src/questions/question.js').Question>} */
export const CUSTOM_COMPONENT_CLASSES = Object.freeze({
	[CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS]: RepresentationAttachments,
	[CUSTOM_COMPONENTS.REPRESENTATION_COMMENT]: RepresentationComment,
	[CUSTOM_COMPONENTS.FEE_AMOUNT]: FeeAmountQuestion,
	[CUSTOM_COMPONENTS.CIL_AMOUNT]: CILAmountQuestion,
	[CUSTOM_COMPONENTS.COSTS_APPLICATIONS]: CostsApplicationsCommentQuestion
});
