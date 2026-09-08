import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

export interface ErrorMessage {
	text: string;
	href: string;
}

/**
 * Interface mapping only the fields required for the validation checks.
 */
export interface RepresentationForValidation {
	submittedForId?: string | null;
	submittedDate?: string | Date | null;
	categoryId?: string | null;
	wantsToBeHeard?: boolean | null;
	representedTypeId?: string | null;
	submittedByAgent?: boolean | null;
	submittedByAgentOrgName?: string | null;
	RepresentedContact?: {
		firstName?: string | null;
		lastName?: string | null;
		orgName?: string | null;
	} | null;
	SubmittedByContact?: {
		jobTitleOrRole?: string | null;
	} | null;
}

/**
 * Get the required answers for representations
 */
export function getRepresentationValidationErrors(
	representation: RepresentationForValidation,
	originUrl: string
): (ErrorMessage | undefined)[] {
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
 * Get the common required answers for representations
 */
export function getCommonRequiredAnswers(
	representation: RepresentationForValidation,
	originUrl: string
): (ErrorMessage | undefined)[] {
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
 * Get the required answers for representations on behalf of
 */
export function getOnBehalfOfRequiredAnswers(
	representation: RepresentationForValidation,
	originUrl: string
): (ErrorMessage | undefined)[] {
	const requiredAnswers: (ErrorMessage | undefined)[] = [
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
 */
export function getAgentRequiredAnswers(
	representation: RepresentationForValidation,
	originUrl: string
): (ErrorMessage | undefined)[] {
	const agentRequiredQuestions: (ErrorMessage | undefined)[] = [
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
 */
export function getPersonRequiredAnswers(
	representation: RepresentationForValidation,
	originUrl: string
): (ErrorMessage | undefined)[] {
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
 */
export function getWorkForOrgRequiredAnswers(
	representation: RepresentationForValidation,
	originUrl: string
): (ErrorMessage | undefined)[] {
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
 */
export function getNotWorkForOrgRequiredAnswers(
	representation: RepresentationForValidation,
	originUrl: string
): (ErrorMessage | undefined)[] {
	return [
		checkRequiredAnswer(
			representation.RepresentedContact?.orgName,
			'Enter the full name of the organisation you are representing',
			`${originUrl}/edit/agent/name-organisation-representing`
		)
	];
}

/**
 * Gets missing required answer
 */
export function checkRequiredAnswer(value: unknown, errorMessage: string, pageLink: string): ErrorMessage | undefined {
	if (typeof value === 'undefined' || value === '' || value === null) {
		return {
			text: errorMessage,
			href: pageLink
		};
	}
	return undefined;
}
