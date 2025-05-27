import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.js';
import { addSessionData } from '@pins/crowndev-lib/util/session.js';

/**
 * Validate a representation before it can be accepted, rejected or redacted
 * @param {import('#service').ManageService} services
 * @returns {import('express').Handler}
 */
export function buildValidateRepresentationMiddleware(services) {
	return async (req, res, next) => {
		const { db, logger } = services;
		const representationRef = req.params.representationRef;
		const id = req.params.id;

		if (!id) {
			throw new Error(`id param required`);
		}
		if (!representationRef) {
			throw new Error(`representationRef param required`);
		}
		logger.info({ representationReference: representationRef }, 'validate representation');
		const representation = await db.representation.findUnique({
			where: { reference: representationRef },
			include: {
				SubmittedByContact: true,
				RepresentedContact: true
			}
		});

		if (!representation) {
			return notFoundHandler(req, res);
		}

		const originUrl = `/cases/${id}/manage-representations/${representationRef}`;
		const errors = getRepresentationValidationErrors(representation, originUrl).filter((value) => value !== undefined);

		if (errors.length > 0) {
			addSessionData(req, representationRef, { errors }, 'representations');
			return res.redirect(req.baseUrl);
		}

		return next();
	};
}

/**
 * @typedef {Object} ErrorMessage
 * @property {string} text
 * @property {string} href
 */

/**
 * @description Get the required answers for representations
 * @param representation
 * @param originUrl
 * @returns {ErrorMessage[]}
 */
function getRepresentationValidationErrors(representation, originUrl) {
	const submittedForId = representation.submittedForId;

	switch (submittedForId) {
		case REPRESENTATION_SUBMITTED_FOR_ID.MYSELF:
			return getCommonRequiredAnswers(representation, originUrl);
		case REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF:
			return getCommonRequiredAnswers(representation, originUrl).concat(
				getOnBehalfOfRequiredAnswers(representation, originUrl)
			);
		default:
			return [
				checkRequiredAnswer(
					representation.submittedForId,
					'Enter who the representation is submitted for',
					`${originUrl}/edit/start/who-submitted-for`
				)
			];
	}
}

/**
 * @description Get the common required answers for representations
 * @param representation
 * @param originUrl
 * @returns {ErrorMessage[]}
 * */
function getCommonRequiredAnswers(representation, originUrl) {
	const representingFor = representation.submittedForId === REPRESENTATION_SUBMITTED_FOR_ID.MYSELF ? 'myself' : 'agent';
	return [
		checkRequiredAnswer(
			representation.submittedDate,
			'Enter the representation received date',
			`${originUrl}/edit/details/representation-date`
		),
		checkRequiredAnswer(
			representation.categoryId,
			'Enter a representation type',
			`${originUrl}/edit/details/representation-type`
		),
		checkRequiredAnswer(
			representation.wantsToBeHeard,
			'Enter the hearing preference',
			`${originUrl}/edit/${representingFor}/hearing-preference`
		)
	];
}

/**
 * @description Get the required answers for representations on behalf of
 * @param representation
 * @param originUrl
 * @returns {ErrorMessage[]}
 */
function getOnBehalfOfRequiredAnswers(representation, originUrl) {
	const requiredAnswers = [
		checkRequiredAnswer(
			representation.representedTypeId,
			'Enter who they are representing',
			`${originUrl}/edit/agent/who-representing`
		)
	];
	switch (representation.representedTypeId) {
		case REPRESENTED_TYPE_ID.ORGANISATION:
			return requiredAnswers.concat(getWorkForOrgRequiredAnswers(representation, originUrl));
		case REPRESENTED_TYPE_ID.PERSON:
			return requiredAnswers.concat(
				getAgentRequiredAnswers(representation, originUrl),
				getPersonRequiredAnswers(representation, originUrl)
			);
		case REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR:
			return requiredAnswers.concat(
				getAgentRequiredAnswers(representation, originUrl),
				getNotWorkForOrgRequiredAnswers(representation, originUrl)
			);
		default:
			return requiredAnswers;
	}
}

/**
 * Agent specific required answers
 * @param representation
 * @param originUrl
 * @returns {ErrorMessage[]}
 */
function getAgentRequiredAnswers(representation, originUrl) {
	const agentRequiredQuestions = [
		checkRequiredAnswer(
			representation.submittedByAgent,
			'Enter if they are acting as an agent on behalf of a client',
			`${originUrl}/edit/agent/are-you-agent`
		)
	];
	if (representation.submittedByAgent === true) {
		agentRequiredQuestions.push(
			checkRequiredAnswer(
				representation.submittedByAgentOrgName,
				"Enter the agent's organisation name",
				`${originUrl}/edit/agent/agent-organisation-name`
			)
		);
	}
	return agentRequiredQuestions;
}
/**
 * Required answers for representing on behalf of a person
 * @param representation
 * @param originUrl
 * @returns {ErrorMessage[]}
 */
function getPersonRequiredAnswers(representation, originUrl) {
	return [
		checkRequiredAnswer(
			representation.RepresentedContact?.firstName && representation.RepresentedContact?.lastName,
			"Enter the represented person's name",
			`${originUrl}/edit/agent/name-person-representing`
		)
	];
}
/**
 * Required answers for representing on behalf of an organisation I work for
 * @param representation
 * @param originUrl
 * @returns {ErrorMessage[]}
 */
function getWorkForOrgRequiredAnswers(representation, originUrl) {
	return [
		checkRequiredAnswer(
			representation.RepresentedContact?.orgName,
			'Enter the organisation or charity name',
			`${originUrl}/edit/agent/name-organisation`
		),
		checkRequiredAnswer(
			representation.SubmittedByContact?.jobTitleOrRole,
			"Enter the agent's job role",
			`${originUrl}/edit/agent/what-job-title-or-role`
		)
	];
}
/**
 * Required answers for representing on behalf of an organisation I do not work for
 * @param representation
 * @param originUrl
 * @returns {ErrorMessage[]}
 */
function getNotWorkForOrgRequiredAnswers(representation, originUrl) {
	return [
		checkRequiredAnswer(
			representation.RepresentedContact?.orgName,
			'Enter the full name of the organisation you are representing',
			`${originUrl}/edit/agent/name-organisation-representing`
		)
	];
}

/**
 * @description Gets missing required answer
 * @param {*} value
 * @param {string} errorMessage
 * @param {string} pageLink
 * @returns {ErrorMessage|undefined}
 */
function checkRequiredAnswer(value, errorMessage, pageLink) {
	if (typeof value === 'undefined' || value === '' || value === null) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
}
