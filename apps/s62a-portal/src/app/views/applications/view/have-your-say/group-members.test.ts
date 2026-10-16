import assert from 'node:assert';
import { describe, it, type TestContext } from 'node:test';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import { BOOLEAN_OPTIONS, JourneyResponse } from '@planning-inspectorate/dynamic-forms';
import type { Request } from 'express';
import { getGroupMemberPageState, goStraightToFirstGroupMember, limitGroupMembers } from './group-members.ts';
import { createJourney, JOURNEY_ID } from './journey.ts';
import { getHaveYourSayQuestions } from './questions.ts';

const applicationId = '123e4567-e89b-12d3-a456-426614174000';
const baseUrl = `/applications/${applicationId}/have-your-say`;
const list = `${baseUrl}/agent/check-group-name-details`;

function members(count: number) {
	return Array.from({ length: count }, (_, i) => ({
		id: `member-${i + 1}`,
		groupRepresentedFirstName: 'Person',
		groupRepresentedLastName: `${i + 1}`
	}));
}

function answers(memberCount: number) {
	return {
		submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
		representedTypeId: REPRESENTED_TYPE_ID.GROUP,
		hasGroupName: BOOLEAN_OPTIONS.NO,
		manageGroupDetails: members(memberCount)
	};
}

function mockRequest(method: string, params: Record<string, string>) {
	return { method, baseUrl, params: { applicationId, section: 'agent', ...params } } as unknown as Request;
}

/** res.locals as getJourneyResponse and getJourney leave them, with a real journey */
function mockRes(context: TestContext, req: Request, memberCount: number) {
	const journeyResponse = new JourneyResponse(JOURNEY_ID, 'session-id', answers(memberCount));
	const journey = createJourney(getHaveYourSayQuestions(), journeyResponse, req);
	return {
		locals: { journey, journeyResponse } as Record<string, any>,
		redirect: context.mock.fn()
	};
}

describe('getGroupMemberPageState', () => {
	it('should count the other people in the group, not the one on this page', () => {
		const journeyResponse = new JourneyResponse(JOURNEY_ID, 'session-id', answers(3));
		const req = mockRequest('GET', { manageListAction: 'edit', manageListItemId: 'member-2' });

		assert.deepStrictEqual(getGroupMemberPageState(req, journeyResponse), {
			manageListAction: 'edit',
			otherMembers: 2
		});
	});
	it('should have no action and no members outside the list', () => {
		const journeyResponse = new JourneyResponse(JOURNEY_ID, 'session-id', {});
		const req = mockRequest('GET', { question: 'group-has-name' });

		assert.deepStrictEqual(getGroupMemberPageState(req, journeyResponse), {
			manageListAction: undefined,
			otherMembers: 0
		});
	});
});

describe('limitGroupMembers', () => {
	const addParams = {
		question: 'check-group-name-details',
		manageListAction: 'add',
		manageListItemId: 'new-member',
		manageListQuestion: 'group-name-person-representing'
	};

	it('should send an 11th person back to the list (PEAS-102: maximum 10)', (context) => {
		const req = mockRequest('GET', addParams);
		const res = mockRes(context, req, 10);
		const next = context.mock.fn();

		limitGroupMembers(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assert.strictEqual(res.redirect.mock.calls[0].arguments[0], list);
	});
	it('should allow adding a 10th person', (context) => {
		const req = mockRequest('POST', addParams);
		const res = mockRes(context, req, 9);
		const next = context.mock.fn();

		limitGroupMembers(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
	});
	it('should allow changing someone in a full group', (context) => {
		const req = mockRequest('GET', { ...addParams, manageListAction: 'edit', manageListItemId: 'member-3' });
		const res = mockRes(context, req, 10);
		const next = context.mock.fn();

		limitGroupMembers(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
	});
});

describe('goStraightToFirstGroupMember', () => {
	it('should go from an empty list straight to the first person page (PEAS-102 Scenario 6)', (context) => {
		const req = mockRequest('GET', { question: 'check-group-name-details' });
		const res = mockRes(context, req, 0);
		const next = context.mock.fn();

		goStraightToFirstGroupMember(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 0);
		assert.match(
			res.redirect.mock.calls[0].arguments[0],
			new RegExp(`^${list}/add/[0-9a-f-]{36}/group-name-person-representing$`)
		);
	});
	it('should show the list once someone has been added', (context) => {
		const req = mockRequest('GET', { question: 'check-group-name-details' });
		const res = mockRes(context, req, 1);
		const next = context.mock.fn();

		goStraightToFirstGroupMember(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.callCount(), 0);
	});
	it('should not redirect a POST of the empty list', (context) => {
		const req = mockRequest('POST', { question: 'check-group-name-details' });
		const res = mockRes(context, req, 0);
		const next = context.mock.fn();

		goStraightToFirstGroupMember(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.callCount(), 0);
	});
	it('should point Back on the first person page at the page before the list, not the list', (context) => {
		const req = mockRequest('GET', {
			question: 'check-group-name-details',
			manageListAction: 'add',
			manageListItemId: 'new-member',
			manageListQuestion: 'group-name-person-representing'
		});
		const res = mockRes(context, req, 0);
		const next = context.mock.fn();

		goStraightToFirstGroupMember(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.locals.journey.getBackLink({ params: req.params }), `${baseUrl}/agent/group-has-name`);
	});
	it('should leave other pages alone', (context) => {
		const req = mockRequest('GET', { question: 'group-has-name' });
		const res = mockRes(context, req, 0);
		const next = context.mock.fn();

		goStraightToFirstGroupMember(req, res as any, next);

		assert.strictEqual(next.mock.callCount(), 1);
		assert.strictEqual(res.redirect.mock.callCount(), 0);
	});
});
