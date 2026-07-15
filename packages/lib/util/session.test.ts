import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	addSessionData,
	readSessionData,
	clearSessionData,
	removeApplicantContactsWhenOrganisationRemoved
} from './session.ts';
import type { Request, Response } from 'express';

type MockSession = Record<string, Record<string, Record<string, unknown>>>;

function makeReq(sessionData: MockSession | null = {}): Request {
	return { session: sessionData } as unknown as Request;
}

describe('addSessionData', () => {
	it('should create session field and id entries when they do not exist', () => {
		const sessionData: MockSession = {};
		const req = makeReq(sessionData);
		addSessionData(req, 'case-1', { updated: true });
		assert.deepStrictEqual(sessionData['cases']['case-1'], { updated: true });
	});

	it('should merge data into an existing session entry', () => {
		const sessionData: MockSession = { cases: { 'case-1': { existing: 'value' } } };
		const req = makeReq(sessionData);
		addSessionData(req, 'case-1', { updated: true });
		assert.deepStrictEqual(sessionData['cases']['case-1'], { existing: 'value', updated: true });
	});

	it('should use a custom sessionField when provided', () => {
		const sessionData: MockSession = {};
		const req = makeReq(sessionData);
		addSessionData(req, 'item-1', { foo: 'bar' }, 'custom');
		assert.deepStrictEqual(sessionData['custom']['item-1'], { foo: 'bar' });
	});

	it('should throw when session is missing', () => {
		const req = { session: null } as unknown as Request;
		assert.throws(() => addSessionData(req, 'case-1', {}), /request session required/);
	});

	it('should throw when session is not present on the request', () => {
		const req = {} as Request;
		assert.throws(() => addSessionData(req, 'case-1', {}), /request session required/);
	});

	it('should throw when id is an unsafe key', () => {
		const req = makeReq();
		assert.throws(() => addSessionData(req, '__proto__', {}), /unsafe session key/);
	});

	it('should throw when sessionField is an unsafe key', () => {
		const req = makeReq();
		assert.throws(() => addSessionData(req, 'case-1', {}, 'constructor'), /unsafe session key/);
	});
});

describe('readSessionData', () => {
	it('should return the stored value when it exists', () => {
		const req = makeReq({ cases: { 'case-1': { updated: true } } });
		assert.strictEqual(readSessionData(req, 'case-1', 'updated', false), true);
	});

	it('should return the default value when the field does not exist', () => {
		const req = makeReq({ cases: { 'case-1': {} } });
		assert.strictEqual(readSessionData(req, 'case-1', 'updated', false), false);
	});

	it('should return the default value when the id does not exist', () => {
		const req = makeReq({ cases: {} });
		assert.strictEqual(readSessionData(req, 'case-1', 'updated', 'default'), 'default');
	});

	it('should return the default value when the sessionField does not exist', () => {
		const req = makeReq({});
		assert.strictEqual(readSessionData(req, 'case-1', 'updated', 42), 42);
	});

	it('should return false when session is missing', () => {
		const req = { session: null } as unknown as Request;
		assert.strictEqual(readSessionData(req, 'case-1', 'updated', true), false);
	});

	it('should return false when session is not present on the request', () => {
		const req = {} as Request;
		assert.strictEqual(readSessionData(req, 'case-1', 'updated', 'default'), false);
	});

	it('should preserve intentional false values', () => {
		const req = makeReq({ cases: { 'case-1': { updated: false } } });
		assert.strictEqual(readSessionData(req, 'case-1', 'updated', true), false);
	});

	it('should use a custom sessionField when provided', () => {
		const req = makeReq({ custom: { 'item-1': { foo: 'bar' } } });
		assert.strictEqual(readSessionData(req, 'item-1', 'foo', null, 'custom'), 'bar');
	});

	it('should throw when id is an unsafe key', () => {
		const req = makeReq();
		assert.throws(() => readSessionData(req, '__proto__', 'field', null), /unsafe session key/);
	});

	it('should throw when field is an unsafe key', () => {
		const req = makeReq();
		assert.throws(() => readSessionData(req, 'case-1', 'prototype', null), /unsafe session key/);
	});
});

describe('clearSessionData', () => {
	it('should remove a single field from the session entry', () => {
		const sessionData: MockSession = { cases: { 'case-1': { updated: true, other: 'value' } } };
		const req = makeReq(sessionData);
		clearSessionData(req, 'case-1', 'updated');
		assert.strictEqual('updated' in sessionData['cases']['case-1'], false);
		assert.strictEqual(sessionData['cases']['case-1']['other'], 'value');
	});

	it('should remove multiple fields from the session entry when an array is provided', () => {
		const sessionData: MockSession = { cases: { 'case-1': { a: 1, b: 2, c: 3 } } };
		const req = makeReq(sessionData);
		clearSessionData(req, 'case-1', ['a', 'b']);
		assert.strictEqual('a' in sessionData['cases']['case-1'], false);
		assert.strictEqual('b' in sessionData['cases']['case-1'], false);
		assert.strictEqual(sessionData['cases']['case-1']['c'], 3);
	});

	it('should do nothing when session is missing', () => {
		const req = { session: null } as unknown as Request;
		assert.doesNotThrow(() => clearSessionData(req, 'case-1', 'updated'));
	});

	it('should leave request unchanged when session is not present on the request', () => {
		const req = {} as Request;
		clearSessionData(req, 'case-1', 'updated');
		assert.deepStrictEqual(req, {});
	});

	it('should do nothing when the id does not exist in the session', () => {
		const req = makeReq({ cases: {} });
		assert.doesNotThrow(() => clearSessionData(req, 'case-1', 'updated'));
	});

	it('should skip unsafe keys in array of fields without throwing', () => {
		const sessionData: MockSession = { cases: { 'case-1': { safe: 'value' } } };
		const req = makeReq(sessionData);
		assert.doesNotThrow(() => clearSessionData(req, 'case-1', ['__proto__', 'safe']));
		assert.strictEqual('safe' in sessionData['cases']['case-1'], false);
	});

	it('should do nothing when a single field is an unsafe key', () => {
		const req = makeReq({ cases: { 'case-1': { safe: 'value' } } });
		assert.doesNotThrow(() => clearSessionData(req, 'case-1', 'constructor'));
	});

	it('should use a custom sessionField when provided', () => {
		const sessionData: MockSession = { custom: { 'item-1': { foo: 'bar' } } };
		const req = makeReq(sessionData);
		clearSessionData(req, 'item-1', 'foo', 'custom');
		assert.strictEqual('foo' in sessionData['custom']['item-1'], false);
	});

	it('should throw when id is an unsafe key', () => {
		const req = makeReq();
		assert.throws(() => clearSessionData(req, '__proto__', 'field'), /unsafe session key/);
	});

	it('should throw when sessionField is an unsafe key', () => {
		const req = makeReq();
		assert.throws(() => clearSessionData(req, 'case-1', 'field', 'prototype'), /unsafe session key/);
	});
});

describe('create-a-case - remove applicant contacts when organisation removed', () => {
	const JOURNEY_ID = 'test-journey';

	interface MakeReqOptions {
		params?: Record<string, string>;
		answers?: { manageApplicantContactDetails?: unknown };
	}

	type TestRequest = Request & {
		session?: {
			forms?: Record<string, { manageApplicantContactDetails?: unknown }>;
		};
	};

	function makeReq({ params, answers }: MakeReqOptions = {}): TestRequest {
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
		} as unknown as TestRequest;
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

		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID)(req, {} as unknown as Response, next);

		assert.deepStrictEqual(req.session?.forms?.[JOURNEY_ID]?.manageApplicantContactDetails, [
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

		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID)(req, {} as unknown as Response, next);

		assert.deepStrictEqual(req.session?.forms?.[JOURNEY_ID]?.manageApplicantContactDetails, [
			null,
			{ applicantFirstName: 'No selector' }
		]);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should do nothing when manageApplicantContactDetails is not an array', () => {
		const req = makeReq({ answers: { manageApplicantContactDetails: { some: 'object' } } });
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID)(req, {} as unknown as Response, next);

		assert.deepStrictEqual(req.session?.forms?.[JOURNEY_ID]?.manageApplicantContactDetails, { some: 'object' });
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should do nothing when session does not contain answers for the journey', () => {
		const req = makeReq();
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID)(req, {} as unknown as Response, next);

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

		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID)(req, {} as unknown as Response, next);

		assert.deepStrictEqual(req.session?.forms?.[JOURNEY_ID]?.manageApplicantContactDetails, [
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

		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID)(req, {} as unknown as Response, next);

		assert.deepStrictEqual(req.session?.forms?.[JOURNEY_ID]?.manageApplicantContactDetails, [
			{ applicantContactOrganisation: 'org-1' }
		]);
		assert.strictEqual(next.mock.callCount(), 1);
	});

	it('should forward errors to next when an exception is thrown', () => {
		const req = makeReq({ answers: { manageApplicantContactDetails: [] } });
		Reflect.deleteProperty(req, 'params');
		const next = mock.fn();

		removeApplicantContactsWhenOrganisationRemoved(JOURNEY_ID)(req, {} as unknown as Response, next);

		assert.strictEqual(next.mock.callCount(), 1);
		const [err] = next.mock.calls[0].arguments;
		assert.ok(err instanceof Error);
	});
});
