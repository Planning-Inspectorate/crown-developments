import { validationResult } from 'express-validator';

/** @type {import('express').Handler} */
const validate = async (req, res, next) => {
	const { section, question } = req.params;

	const { journey, journeyResponse } = res.locals;

	const questionObj = journey.getQuestionBySectionAndName(section, question);
	if (!questionObj) {
		throw new Error('unknown question type');
	}

	for (const validation of questionObj.validators) {
		const validationRules = validation.validate(questionObj, journeyResponse);

		if (validationRules instanceof Array) {
			await Promise.all(validationRules.map((validator) => validator.run(req)));

			const errors = validationResult(req);
			const mappedErrors = errors.mapped();

			if (Object.keys(mappedErrors).length > 0) {
				break;
			}
		} else {
			const validatedRequest = await validationRules.run(req);

			if (validatedRequest.errors.length > 0) {
				break;
			}
		}
	}

	return next();
};
export default validate;
