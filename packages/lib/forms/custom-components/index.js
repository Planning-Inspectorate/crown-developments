import RepresentationComment from './representation-comment/question.js';
import FeeAmountQuestion from './fee-amount/question.js';
import RepresentationAttachments from './representation-attachments/question.js';
import CILAmountQuestion from './cil-amount/question.js';
import CostsApplicationsCommentQuestion from './costs-applications-comment/question.js';
import CustomManageListQuestion from './manage-list/question.js';

/**
 * Derive the union type of allowed components from the object.
 * @typedef {typeof CUSTOM_COMPONENTS[keyof typeof CUSTOM_COMPONENTS]} CustomQuestionTypes
 */
export const CUSTOM_COMPONENTS = Object.freeze({
	REPRESENTATION_ATTACHMENTS: 'representation-attachments',
	REPRESENTATION_COMMENT: 'representation-comment',
	FEE_AMOUNT: 'fee-amount',
	CIL_AMOUNT: 'cil-amount',
	COSTS_APPLICATIONS: 'costs-applications',
	CUSTOM_MANAGE_LIST: 'manage-list'
});

/** @type {Readonly<Record<string, typeof RepresentationAttachments | typeof RepresentationComment | typeof FeeAmountQuestion | typeof CILAmountQuestion | typeof CostsApplicationsCommentQuestion>>} */
export const CUSTOM_COMPONENT_CLASSES = Object.freeze({
	[CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS]: RepresentationAttachments,
	[CUSTOM_COMPONENTS.REPRESENTATION_COMMENT]: RepresentationComment,
	[CUSTOM_COMPONENTS.FEE_AMOUNT]: FeeAmountQuestion,
	[CUSTOM_COMPONENTS.CIL_AMOUNT]: CILAmountQuestion,
	[CUSTOM_COMPONENTS.COSTS_APPLICATIONS]: CostsApplicationsCommentQuestion,
	[CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST]: CustomManageListQuestion
});
