import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
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
		/** @type {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
		const journeyResponse = res.locals.journeyResponse;
		/**
		 * @type {import('./types.js').CreateCaseAnswers}
		 */
		const answers = journeyResponse.answers;
		if (typeof answers !== 'object') {
			throw new Error('answers should be an object');
		}
		const reference = await newReference(db); // TODO: generate
		const input = toCreateInput(answers, reference);
		logger.info({ reference }, 'creating a new case');
		await db.crownDevelopment.create({
			data: input
		});
		logger.info({ reference }, 'created a new case');

		res.redirect(`/create-a-case/success?reference=${reference}`);
	};
}

/**
 * @param {import('./types.js').CreateCaseAnswers} answers
 * @param {string} reference
 * @returns {import('@prisma/client').Prisma.CrownDevelopmentCreateInput}
 */
function toCreateInput(answers, reference) {
	/** @type {import('@prisma/client').Prisma.CrownDevelopmentCreateInput} */
	const input = {
		reference,
		name: answers.projectName,
		description: answers.projectDescription,
		Type: { connect: { id: answers.typeOfApplication } },
		siteArea: toNumber(answers.siteArea),
		siteEasting: toNumber(answers.siteEasting),
		siteNorthing: toNumber(answers.siteNorthing),
		sitePostcode: answers.sitePostCode,
		expectedDateOfSubmission: answers.expectedDateOfSubmission
	};

	if (hasAnswers(answers, 'lpaContact')) {
		input.LpaContact = {
			create: {
				fullName: answers.lpaContactName,
				email: answers.lpaContactEmail,
				telephoneNumber: answers.lpaContactTelephoneNumber
			}
		};
		if (answers.lpaContactAddress) {
			input.LpaContact.create.Address = {
				create: toAddressInput(answers.lpaContactAddress)
			};
		}
	}

	if (hasAnswers(answers, 'applicant')) {
		input.ApplicantContact = {
			create: {
				fullName: answers.applicantName,
				email: answers.applicantEmail,
				telephoneNumber: answers.applicantTelephoneNumber
			}
		};
		if (answers.applicantAddress) {
			input.ApplicantContact.create.Address = {
				create: toAddressInput(answers.applicantAddress)
			};
		}
	}

	if (hasAnswers(answers, 'agent')) {
		input.AgentContact = {
			create: {
				fullName: answers.agentName,
				email: answers.agentEmail,
				telephoneNumber: answers.agentTelephoneNumber
			}
		};
		if (answers.agentAddress) {
			input.AgentContact.create.Address = {
				create: toAddressInput(answers.agentAddress)
			};
		}
	}

	return input;
}

/**
 *
 * @param {string} [answer]
 * @returns {number|null}
 */
function toNumber(answer) {
	if (answer) {
		return parseFloat(answer);
	}
	return null;
}

/**
 * @param {import('./types.js').Address} address
 * @returns {import('@prisma/client').Prisma.AddressCreateInput}
 */
function toAddressInput(address) {
	return {
		line1: address.addressLine1,
		line2: address.addressLine2,
		townCity: address.townCity,
		county: address.county,
		postcode: address.postcode
	};
}

/**
 * Have any of the answers with a given prefix got an answer
 *
 * @param {import('./types.js').CreateCaseAnswers} answers
 * @param {string} prefix
 * @returns {boolean}
 */
function hasAnswers(answers, prefix) {
	return Object.entries(answers)
		.filter(([k]) => k.startsWith(prefix))
		.some(([, v]) => Boolean(v));
}

/**
 * Generate a new case reference
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {Date} [date]
 * @returns {Promise<string>}
 */
export async function newReference(db, date = new Date()) {
	const latestCase = await db.crownDevelopment.findMany({
		select: { reference: true },
		take: 1,
		orderBy: {
			reference: 'desc'
		}
	});
	let latestId = 0;
	if (latestCase.length === 1) {
		const latestRef = latestCase[0].reference;
		const parts = latestRef.split('/');
		if (parts.length === 3) {
			latestId = parseInt(parts[2]);
		}
	}

	const year = formatDateForDisplay(date, { format: 'yyyy' });
	const id = (latestId + 1).toString().padStart(7, '0');

	return `CROWN/${year}/${id}`;
}
