import RepresentationComment from './representation-comment/question.js';
import FeeAmountQuestion from './fee-amount/question.js';
import RepresentationAttachments from './representation-attachments/question.js';
import CILAmountQuestion from './cil-amount/question.js';
import CostsApplicationsCommentQuestion from './costs-applications-comment/question.js';
import CustomManageListQuestion from './manage-list/question.js';
import CustomMultiFieldInputQuestion from './custom-multi-field-input/question.js';

/**
 * Typed wrapper around Object.freeze() to preserve inference for object literals.
 * @template {Record<string, any>} T
 * @param {T} obj
 * @returns {Readonly<T>}
 */
const freeze = (obj) => Object.freeze(obj);

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
	CUSTOM_MANAGE_LIST: 'manage-list',
	CUSTOM_MULTI_FIELD_INPUT: 'custom-multi-field-input'
});

export const CUSTOM_COMPONENT_CLASSES = freeze({
	[CUSTOM_COMPONENTS.REPRESENTATION_ATTACHMENTS]: RepresentationAttachments,
	[CUSTOM_COMPONENTS.REPRESENTATION_COMMENT]: RepresentationComment,
	[CUSTOM_COMPONENTS.FEE_AMOUNT]: FeeAmountQuestion,
	[CUSTOM_COMPONENTS.CIL_AMOUNT]: CILAmountQuestion,
	[CUSTOM_COMPONENTS.COSTS_APPLICATIONS]: CostsApplicationsCommentQuestion,
	[CUSTOM_COMPONENTS.CUSTOM_MANAGE_LIST]: CustomManageListQuestion,
	[CUSTOM_COMPONENTS.CUSTOM_MULTI_FIELD_INPUT]: CustomMultiFieldInputQuestion
});
