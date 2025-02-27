import RepresentationComment from './representation-comment/question.js';

/**
 * @type {Readonly<{REPRESENTATION_COMMENT: string}>}
 */
export const CUSTOM_COMPONENTS = Object.freeze({
	REPRESENTATION_COMMENT: 'representation-comment'
});

/** @type {Record<string, import('@pins/dynamic-forms/src/questions/question.js').Question>} */
export const CUSTOM_COMPONENT_CLASSES = Object.freeze({
	[CUSTOM_COMPONENTS.REPRESENTATION_COMMENT]: RepresentationComment
});
