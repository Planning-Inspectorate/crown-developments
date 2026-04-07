import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { removeApplicantContactsWhenOrganisationRemoved } from './session.js';
import { JOURNEY_ID } from './journey.js';

describe('create-a-case - remove applicant contacts when organisation removed', () => {
	function makeReq({ params, answers } = {}) {
		return {
			params: {
				question: 'check-applicant-details',
				manageListAction: 'remove',
				manageListItemId: 'org-1',
				manageListQuestion: 'confirm',
				...params
			},
			session:
				answers === undefined
					? undefined
					: {
							forms: {
								[JOURNEY_ID]: answers
							}
						}
		};
	}

	it('should remove contacts linked to the removed organisation id', () => {
		const req = makeReq({
			answers: {
				manageApplicantContactDetails: [
					{ applicantContactOrganisation: 'org-1', applicantFirstName: 'A' },
					{ applicantContactOrganisation: 'org-2', applicantFirstName: 'B' },
					{ applicantContactOrganisation: 'org-1', applicantFirstName: 'C' }
				]
			}
		});
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved()(req, {}, next);

		assert.deepStrictEqual(req.session.forms[JOURNEY_ID].manageApplicantContactDetails, [
			{ applicantContactOrganisation: 'org-2', applicantFirstName: 'B' }
		]);
		assert.strictEqual(next.mock.callCount(), 1);
		assert.deepStrictEqual(next.mock.calls[0].arguments, []);
	});

	it('should keep contacts that are missing an organisation selector', () => {
		const req = makeReq({
			answers: {
				manageApplicantContactDetails: [
					{ applicantContactOrganisation: 'org-1', applicantFirstName: 'A' },
					null,
					{ applicantFirstName: 'No selector' }
				]
			}
		});
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved()(req, {}, next);

		assert.deepStrictEqual(req.session.forms[JOURNEY_ID].manageApplicantContactDetails, [
			null,
			{ applicantFirstName: 'No selector' }
		]);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should do nothing when manageApplicantContactDetails is not an array', () => {
		const req = makeReq({ answers: { manageApplicantContactDetails: { some: 'object' } } });
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved()(req, {}, next);

		assert.deepStrictEqual(req.session.forms[JOURNEY_ID].manageApplicantContactDetails, { some: 'object' });
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should do nothing when session does not contain answers for the journey', () => {
		const req = makeReq();
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved()(req, {}, next);

		assert.strictEqual(req.session, undefined);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should do nothing when request is not the remove confirm step for applicant organisations', () => {
		const req = makeReq({
			params: { manageListAction: 'add' },
			answers: {
				manageApplicantContactDetails: [{ applicantContactOrganisation: 'org-1' }]
			}
		});
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved()(req, {}, next);

		assert.deepStrictEqual(req.session.forms[JOURNEY_ID].manageApplicantContactDetails, [
			{ applicantContactOrganisation: 'org-1' }
		]);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should do nothing when manageListItemId is missing', () => {
		const req = makeReq({
			params: { manageListItemId: '' },
			answers: {
				manageApplicantContactDetails: [{ applicantContactOrganisation: 'org-1' }]
			}
		});
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved()(req, {}, next);

		assert.deepStrictEqual(req.session.forms[JOURNEY_ID].manageApplicantContactDetails, [
			{ applicantContactOrganisation: 'org-1' }
		]);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should forward errors to next when an exception is thrown', () => {
		const req = makeReq({ answers: { manageApplicantContactDetails: [] } });
		delete req.params;
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved()(req, {}, next);

		assert.strictEqual(next.mock.callCount(), 1);
		const [err] = next.mock.calls[0].arguments;
		assert.ok(err instanceof Error);
	});
});
