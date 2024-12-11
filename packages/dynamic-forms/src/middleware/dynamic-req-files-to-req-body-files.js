/**
 * Middleware for converting `req.files` to `req.body.files`.
 *
 * The requirement for this is due to `express-validator` only considering a limited subset of
 * keys on the `req` object as being eligible for validation.
 *
 * This middleware is designed for use with component-based dynamic forms
 *
 * This has not been tested with
 * pages that contain two or more multiple file uploads.
 *
 * @returns {function(*, *, *): (*)}
 */
export default () => (req, res, next) => {
	if (!req.body || !req.files || !req.params) {
		return next();
	}

	const { section, question } = req.params;
	const { journey } = res.locals;

	const questionObj = journey.getQuestionBySectionAndName(section, question);
	const filesPropertyPath = questionObj.fieldName;

	if (typeof req.files[filesPropertyPath] === 'undefined') {
		req.body.files = [];
		return next();
	}

	try {
		req.body.files = {
			...req.body.files,
			// Ensure we are always working with an array. Single files would otherwise be an object.
			[filesPropertyPath]: Array.isArray(req.files[filesPropertyPath])
				? req.files[filesPropertyPath]
				: [req.files[filesPropertyPath]]
		};
	} catch (err) {
		// this feels like it should never happen, as nothing in the try block throws. This is a precaution.
		/* istanbul ignore next */
		req.log.debug({ err, filesPropertyPath }, 'Error extracting req.files[filesPropertyPath]');
		/* istanbul ignore next */
		req.body.files = [];
	}

	return next();
};
