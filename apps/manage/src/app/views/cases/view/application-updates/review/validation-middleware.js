import { expressValidationErrorsToGovUkErrorList } from '@planning-inspectorate/dynamic-forms/src/validator/validation-error-handler.js';
import { buildUpdateDetailsPage, updateAppUpdatesSession } from './controller.js';
import { validateParams } from '../utils.js';

export function buildValidateAppUpdateDetailsMiddleware({ db }) {
	return async (req, res, next) => {
		const { applicationUpdateId } = validateParams(req.params);
		const updateDetailsValue = req.body.details.trim();
		if (!updateDetailsValue || updateDetailsValue.length > 1000) {
			req.body.errors = {
				details: {
					msg: !updateDetailsValue ? 'Enter update details' : 'Update details must be 1000 characters or less'
				}
			};
			req.body.errorSummary = expressValidationErrorsToGovUkErrorList(req.body.errors);

			updateAppUpdatesSession(req, applicationUpdateId, updateDetailsValue);

			const updateDetailsPage = buildUpdateDetailsPage({ db });
			return updateDetailsPage(req, res);
		}
		return next();
	};
}
