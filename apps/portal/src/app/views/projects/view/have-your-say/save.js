import crypto from 'node:crypto';
import { JOURNEY_ID } from './journey.js';
import { SUBMITTING_FOR_OPTIONS } from './questions.js';
import { REPRESENTATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';
import { clearDataFromSession } from '@pins/dynamic-forms/src/lib/session-answer-store.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} db
 * @param {import('pino').BaseLogger} logger
 * @returns {import('express').Handler}
 */
export function buildSaveController({ db, logger }) {
	return async (req, res) => {
		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		if (!req.params.projectId) {
			throw new Error('project id required');
		}
		const projectId = req.params.projectId;
		/** @type {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
		const journeyResponse = res.locals.journeyResponse;
		/**
		 * @type {import('./types.d.ts').HaveYourSayAnswers}
		 */
		const answers = journeyResponse.answers;
		if (typeof answers !== 'object') {
			throw new Error('answers should be an object');
		}
		let reference;
		await db.$transaction(async ($tx) => {
			reference = await uniqueReference($tx);
			logger.info({ reference }, 'adding a new representation');
			await db.representation.create({
				data: toCreateInput(answers, reference, projectId)
			});
			logger.info({ reference }, 'added a new representation');
		});

		// todo: redirect to check-your-answers on failure?

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID,
			replaceWith: {
				reference
			}
		});

		res.redirect(`${req.baseUrl}/success`);
	};
}

/**
 * @type {import('express').Handler}
 */
export function successController(req, res) {
	const data = req.session?.forms && req.session?.forms[JOURNEY_ID];
	if (!data || !data.reference) {
		throw new Error('invalid have your say session');
	}
	clearDataFromSession({ req, journeyId: JOURNEY_ID });
	res.render('views/projects/view/have-your-say/success.njk', {
		...data
	});
}

/**
 * Generate a unique reference for a representation.
 * Will error after 10 tries.
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {() => string} [generateReference] - this is for testing
 * @returns {Promise<string>}
 */
export async function uniqueReference(db, generateReference = newReference) {
	const MAX_TRIES = 10;
	for (let i = 0; i < MAX_TRIES; i++) {
		const reference = generateReference();
		const count = await db.representation.count({
			where: { reference }
		});
		if (count === 0) {
			return reference;
		}
	}
	throw new Error('unable to generate a unique reference');
}

/**
 * Generate a new reference in the format: AAAA-BBBB-CCCC-DDDD
 * @returns {string}
 */
export function newReference() {
	const ref = crypto.randomBytes(8).toString('hex').toUpperCase();
	return ref.replace(/([A-Z0-9]{4})([A-Z0-9]{4})([A-Z0-9]{4})([A-Z0-9]{4})/, '$1-$2-$3-$4');
}

/**
 * @param {import('./types.d.ts').HaveYourSayAnswers} answers
 * @param {string} reference
 * @param {string} projectId
 * @returns {import('@prisma/client').Prisma.RepresentationCreateInput}
 */
export function toCreateInput(answers, reference, projectId) {
	const input = {
		reference,
		status: 'new',
		receivedDate: new Date(),
		originalComment: answers.comment,
		Project: { connect: { id: projectId } },
		RepresentedType: { connect: { id: representationType(answers.submittingFor) } },
		Contact: {
			create: {
				fullName: fullName(answers),
				email: answers.email,
				telephoneNumber: answers.telephoneNumber
			}
		}
	};
	if (answers.address && answers.address.addressLine1) {
		const address = answers.address;
		input.Contact.create.Address = {
			create: {
				line1: address.addressLine1,
				line2: address.addressLine2,
				townCity: address.townCity,
				county: address.county,
				postcode: address.postcode
			}
		};
	}
	return input;
}

/**
 * @param {string} answer
 * @returns {string}
 */
function representationType(answer) {
	switch (answer) {
		case SUBMITTING_FOR_OPTIONS.AGENT:
			return REPRESENTATION_TYPE_ID.FAMILY_GROUP;
		case SUBMITTING_FOR_OPTIONS.MYSELF:
			return REPRESENTATION_TYPE_ID.PERSON;
		case SUBMITTING_FOR_OPTIONS.ORGANISATION:
			return REPRESENTATION_TYPE_ID.ORGANISATION;
	}
	throw new Error(`invalid representation type: '${answer}'`);
}

/**
 * @param {import('./types.d.ts').HaveYourSayAnswers} answers
 * @returns {string}
 */
function fullName(answers) {
	switch (answers.submittingFor) {
		case SUBMITTING_FOR_OPTIONS.AGENT:
			return answers.fullNameAgent;
		case SUBMITTING_FOR_OPTIONS.MYSELF:
			return answers.fullName;
		case SUBMITTING_FOR_OPTIONS.ORGANISATION:
			return answers.fullNameOrg;
	}
	throw new Error(`invalid representation type: '${answers.submittingFor}'`);
}
