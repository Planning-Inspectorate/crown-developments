import { formatDateForDisplay } from '@pins/dynamic-forms/src/lib/date-utils.js';
import { clearDataFromSession } from '@pins/dynamic-forms/src/lib/session-answer-store.js';
import { JOURNEY_ID } from './journey.js';
import { caseReferenceToFolderName } from '@pins/crowndev-lib/util/name.js';

/**
 * @param {Object} opts
 * @param {import('@prisma/client').PrismaClient} db
 * @param {import('pino').BaseLogger} logger
 * @param {import('../../../config-types.js').Config} config
 * @param {function(session): SharePointDrive} getSharePointDrive
 * @returns {import('express').Handler}
 */
export function buildSaveController({ db, logger, config, getSharePointDrive }) {
	return async (req, res) => {
		if (!res.locals || !res.locals.journeyResponse) {
			throw new Error('journey response required');
		}
		/** @type {import('@pins/dynamic-forms/src/journey/journey-response.js').JourneyResponse} */
		const journeyResponse = res.locals.journeyResponse;
		/**
		 * @type {import('./types.d.ts').CreateCaseAnswers}
		 */
		const answers = journeyResponse.answers;
		if (typeof answers !== 'object') {
			throw new Error('answers should be an object');
		}
		let reference;
		let id;
		// create a new case in a transaction to ensure reference generation is safe
		await db.$transaction(async ($tx) => {
			reference = await newReference($tx);
			const input = toCreateInput(answers, reference);
			logger.info({ reference }, 'creating a new case');
			const created = await $tx.crownDevelopment.create({
				data: input
			});
			id = created.id;
			logger.info({ reference }, 'created a new case');
		});

		const sharePointDrive = getSharePointDrive(req.session);

		// todo: create SharePoint folder structure
		// add tests
		if (sharePointDrive === null) {
			logger.warn(
				'SharePoint not enabled, to use SharePoint functionality setup SharePoint environment variables. See README'
			);
		} else {
			await sharePointDrive.copyDriveItem(config.sharePoint.caseTemplateId, caseReferenceToFolderName(reference));
		}
		// todo: redirect to check-your-answers on failure?

		clearDataFromSession({
			req,
			journeyId: JOURNEY_ID,
			replaceWith: {
				id,
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
	if (!data || !data.id || !data.reference) {
		throw new Error('invalid create case session');
	}
	clearDataFromSession({ req, journeyId: JOURNEY_ID });
	res.render('views/cases/create-a-case/success.njk', {
		...data
	});
}

/**
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
 * @param {string} reference
 * @returns {import('@prisma/client').Prisma.CrownDevelopmentCreateInput}
 */
function toCreateInput(answers, reference) {
	/** @type {import('@prisma/client').Prisma.CrownDevelopmentCreateInput} */
	const input = {
		reference,
		description: answers.applicationDescription,
		Lpa: { connect: { id: answers.lpaId } },
		Type: { connect: { id: answers.typeOfApplication } },
		Status: { connect: { id: 'new' } },
		siteArea: toNumber(answers.siteArea),
		siteEasting: toNumber(answers.siteEasting),
		siteNorthing: toNumber(answers.siteNorthing),
		expectedDateOfSubmission: answers.expectedDateOfSubmission
	};

	if (hasAnswers(answers, 'siteAddress')) {
		input.SiteAddress = {
			create: toAddressInput(answers.siteAddress)
		};
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
 * @param {import('./types.d.ts').Address} address
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
 * @param {import('./types.d.ts').CreateCaseAnswers} answers
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
	const latestCases = await db.crownDevelopment.findMany({
		select: { reference: true },
		take: 2, // only check the last few (we should only need the latest one)
		orderBy: {
			reference: 'desc'
		}
	});
	let latestId = 0;
	if (latestCases.length > 0) {
		// find first valid ID
		for (const latestCase of latestCases) {
			const id = idFromReference(latestCase.reference);
			if (id !== null) {
				latestId = id;
				break;
			}
		}
	}

	const year = formatDateForDisplay(date, { format: 'yyyy' });
	const id = (latestId + 1).toString().padStart(7, '0');

	return `CROWN/${year}/${id}`;
}

/**
 * Extract the ID part of the case reference
 *
 * @param {string} reference - <prefix>/<year>/<id>
 * @returns {number|null}
 */
function idFromReference(reference = '') {
	const parts = reference.split('/');
	if (parts.length === 3) {
		// parts are: CROWN, year, id
		const id = parseInt(parts[2]);
		if (!isNaN(id)) {
			return id;
		}
	}
	return null;
}
