import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REPRESENTATION_SUBMITTED_FOR_ID, REPRESENTED_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';
import {
	checkRequiredAnswer,
	getAgentRequiredAnswers,
	getCommonRequiredAnswers,
	getNotWorkForOrgRequiredAnswers,
	getOnBehalfOfRequiredAnswers,
	getPersonRequiredAnswers,
	getRepresentationValidationErrors,
	getWorkForOrgRequiredAnswers,
	type RepresentationForValidation
} from './validation-utils.ts';

describe('validation-utils', () => {
	const originUrl = '/cases/123/manage-representations/REP-001';

	describe('checkRequiredAnswer', () => {
		it('should return error message object when value is null, undefined, or empty string', () => {
			const errorMsg = 'This field is required';
			const pageLink = '/some-page';

			assert.deepStrictEqual(checkRequiredAnswer(undefined, errorMsg, pageLink), {
				text: errorMsg,
				href: pageLink
			});

			assert.deepStrictEqual(checkRequiredAnswer(null, errorMsg, pageLink), {
				text: errorMsg,
				href: pageLink
			});

			assert.deepStrictEqual(checkRequiredAnswer('', errorMsg, pageLink), {
				text: errorMsg,
				href: pageLink
			});
		});

		it('should return undefined when value is provided', () => {
			const errorMsg = 'This field is required';
			const pageLink = '/some-page';

			assert.strictEqual(checkRequiredAnswer('Valid text', errorMsg, pageLink), undefined);
			assert.strictEqual(checkRequiredAnswer(true, errorMsg, pageLink), undefined);
			assert.strictEqual(checkRequiredAnswer(false, errorMsg, pageLink), undefined);
			assert.strictEqual(checkRequiredAnswer(new Date(), errorMsg, pageLink), undefined);
		});
	});

	describe('getRepresentationValidationErrors', () => {
		it('should return error for missing submittedForId if undefined', () => {
			const representation: RepresentationForValidation = {};
			const errors = getRepresentationValidationErrors(representation, originUrl);

			assert.strictEqual(errors.length, 1);
			assert.deepStrictEqual(errors[0], {
				text: 'Enter who the representation is submitted for',
				href: `${originUrl}/edit/start/who-submitted-for`
			});
		});

		it('should validate MYSELF representation with common required answers', () => {
			const representation: RepresentationForValidation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
			};
			const errors = getRepresentationValidationErrors(representation, originUrl);

			assert.strictEqual(errors.length, 3);
			assert.strictEqual(errors[0]?.text, 'Enter the representation received date');
			assert.strictEqual(errors[1]?.text, 'Enter a representation type');
			assert.strictEqual(errors[2]?.text, 'Enter the hearing preference');
		});

		it('should validate ON_BEHALF_OF representation combining common and on-behalf errors', () => {
			const representation: RepresentationForValidation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
			};
			const errors = getRepresentationValidationErrors(representation, originUrl);

			assert.strictEqual(errors.length, 4);
			assert.strictEqual(errors[0]?.text, 'Enter the representation received date');
			assert.strictEqual(errors[3]?.text, 'Enter who they are representing');
		});
	});

	describe('getCommonRequiredAnswers', () => {
		it('should use "myself" in URL for MYSELF submission', () => {
			const representation: RepresentationForValidation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
			};
			const errors = getCommonRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors[2]?.href, `${originUrl}/edit/myself/hearing-preference`);
		});

		it('should use "agent" in URL for non-MYSELF submission', () => {
			const representation: RepresentationForValidation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
			};
			const errors = getCommonRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors[2]?.href, `${originUrl}/edit/agent/hearing-preference`);
		});

		it('should return undefined items when common fields are provided', () => {
			const representation: RepresentationForValidation = {
				submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
				submittedDate: new Date(),
				categoryId: 'cat-1',
				wantsToBeHeard: true
			};
			const errors = getCommonRequiredAnswers(representation, originUrl);

			assert.deepStrictEqual(errors, [undefined, undefined, undefined]);
		});
	});

	describe('getOnBehalfOfRequiredAnswers', () => {
		it('should include work for org required answers when representedTypeId is ORGANISATION', () => {
			const representation: RepresentationForValidation = {
				representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION
			};
			const errors = getOnBehalfOfRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 3);
			assert.strictEqual(errors[0], undefined);
			assert.strictEqual(errors[1]?.text, 'Enter the organisation or charity name');
			assert.strictEqual(errors[2]?.text, "Enter the agent's job role");
		});

		it('should include person and agent required answers when representedTypeId is PERSON', () => {
			const representation: RepresentationForValidation = {
				representedTypeId: REPRESENTED_TYPE_ID.PERSON
			};
			const errors = getOnBehalfOfRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 3);
			assert.strictEqual(errors[0], undefined);
			assert.strictEqual(errors[1]?.text, 'Enter if they are acting as an agent on behalf of a client');
			assert.strictEqual(errors[2]?.text, "Enter the represented person's name");
		});

		it('should include org not work for required answers when representedTypeId is ORG_NOT_WORK_FOR', () => {
			const representation: RepresentationForValidation = {
				representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR
			};
			const errors = getOnBehalfOfRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 3);
			assert.strictEqual(errors[0], undefined);
			assert.strictEqual(errors[1]?.text, 'Enter if they are acting as an agent on behalf of a client');
			assert.strictEqual(errors[2]?.text, 'Enter the full name of the organisation you are representing');
		});
	});

	describe('getAgentRequiredAnswers', () => {
		it('should check submittedByAgent requirement', () => {
			const representation: RepresentationForValidation = {};
			const errors = getAgentRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0]?.text, 'Enter if they are acting as an agent on behalf of a client');
		});

		it('should check organisation name if submittedByAgent is true', () => {
			const representation: RepresentationForValidation = {
				submittedByAgent: true
			};
			const errors = getAgentRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 2);
			assert.strictEqual(errors[0], undefined);
			assert.strictEqual(errors[1]?.text, "Enter the agent's organisation name");
		});

		it('should pass validation if submittedByAgent is true and organisation name is provided', () => {
			const representation: RepresentationForValidation = {
				submittedByAgent: true,
				submittedByAgentOrgName: 'Agent Org Ltd'
			};
			const errors = getAgentRequiredAnswers(representation, originUrl);

			assert.deepStrictEqual(errors, [undefined, undefined]);
		});
	});

	describe('getPersonRequiredAnswers', () => {
		it('should require both firstName and lastName', () => {
			const representation: RepresentationForValidation = {
				RepresentedContact: { firstName: 'John' }
			};
			const errors = getPersonRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0]?.text, "Enter the represented person's name");
		});

		it('should pass when both firstName and lastName are present', () => {
			const representation: RepresentationForValidation = {
				RepresentedContact: { firstName: 'John', lastName: 'Doe' }
			};
			const errors = getPersonRequiredAnswers(representation, originUrl);

			assert.deepStrictEqual(errors, [undefined]);
		});
	});

	describe('getWorkForOrgRequiredAnswers', () => {
		it('should check orgName and jobTitleOrRole', () => {
			const representation: RepresentationForValidation = {};
			const errors = getWorkForOrgRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 2);
			assert.strictEqual(errors[0]?.text, 'Enter the organisation or charity name');
			assert.strictEqual(errors[1]?.text, "Enter the agent's job role");
		});

		it('should pass when both fields are provided', () => {
			const representation: RepresentationForValidation = {
				RepresentedContact: { orgName: 'Charity Corp' },
				SubmittedByContact: { jobTitleOrRole: 'Manager' }
			};
			const errors = getWorkForOrgRequiredAnswers(representation, originUrl);

			assert.deepStrictEqual(errors, [undefined, undefined]);
		});
	});

	describe('getNotWorkForOrgRequiredAnswers', () => {
		it('should check orgName', () => {
			const representation: RepresentationForValidation = {};
			const errors = getNotWorkForOrgRequiredAnswers(representation, originUrl);

			assert.strictEqual(errors.length, 1);
			assert.strictEqual(errors[0]?.text, 'Enter the full name of the organisation you are representing');
		});

		it('should pass when orgName is provided', () => {
			const representation: RepresentationForValidation = {
				RepresentedContact: { orgName: 'External Org' }
			};
			const errors = getNotWorkForOrgRequiredAnswers(representation, originUrl);

			assert.deepStrictEqual(errors, [undefined]);
		});
	});
});
