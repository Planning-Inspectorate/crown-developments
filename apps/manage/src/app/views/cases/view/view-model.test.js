import { describe, it } from 'node:test';
import assert from 'node:assert';
import { crownDevelopmentToViewModel } from './view-model.js';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

/**
 * @typedef {import('@prisma/client').Prisma.CrownDevelopmentGetPayload<{include: { ApplicantContact: { include: { Address: true } }, AgentContact: { include: { Address: true } }, Event: true, LpaContact: { include: { Address: true } } }}>} CrownDevelopment
 */

describe('view-model', () => {
	describe('crownDevelopmentToViewModel', () => {
		it(`should use created date if no updated date`, () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date()
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.updatedDate, input.createdDate);
		});
		it(`should map LPA fields`, () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				lpaId: 'lpa-1',
				Lpa: {
					name: 'LPA 1',
					email: 'lpa@example.com'
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaId, 'lpa-1');
			assert.strictEqual(result.lpaEmail, 'lpa@example.com');
			assert.strictEqual(result.lpaAddress, undefined);
		});
		it(`should map LPA address if present`, () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date(),
				lpaId: 'lpa-1',
				Lpa: {
					name: 'LPA 1',
					email: 'lpa@example.com',
					Address: {
						line1: 'LPA Street',
						townCity: 'LPA Town',
						postcode: 'LPA ONE'
					}
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaId, 'lpa-1');
			assert.strictEqual(result.lpaEmail, 'lpa@example.com');
			assert.deepStrictEqual(result.lpaAddress, {
				addressLine1: 'LPA Street',
				addressLine2: undefined,
				county: undefined,
				townCity: 'LPA Town',
				postcode: 'LPA ONE'
			});
		});
		it(`should ignore contacts if not present`, () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				createdDate: new Date()
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.applicantContactName, undefined);
			assert.strictEqual(result.agentContactName, undefined);
		});
		it('should map applicant if present', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				ApplicantContact: { fullName: 'contact', email: 'contact@example.com' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.applicantContactName, 'contact');
			assert.strictEqual(result.applicantContactEmail, 'contact@example.com');
			assert.strictEqual(result.agentContactName, undefined);
		});
		it('should map contacts if they exist', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				ApplicantContact: { fullName: 'contact', email: 'contact@example.com' },
				AgentContact: { fullName: 'Agent', email: 'agent@example.com' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.applicantContactName, 'contact');
			assert.strictEqual(result.applicantContactEmail, 'contact@example.com');
			assert.strictEqual(result.agentContactName, 'Agent');
			assert.strictEqual(result.agentContactEmail, 'agent@example.com');
		});
		it('should map contact address if they exist', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				ApplicantContact: {
					fullName: 'contact',
					email: 'contact@example.com',
					Address: {
						line1: 'Some Street',
						line2: 'Some Village',
						townCity: 'Some Place',
						postcode: 'Some PostCode'
					}
				}
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.lpaContactName, undefined);
			assert.strictEqual(result.applicantContactName, 'contact');
			assert.strictEqual(result.applicantContactEmail, 'contact@example.com');
			assert.deepStrictEqual(result.applicantContactAddress, {
				addressLine1: 'Some Street',
				addressLine2: 'Some Village',
				townCity: 'Some Place',
				county: undefined,
				postcode: 'Some PostCode'
			});
			assert.strictEqual(result.agentContactName, undefined);
		});
		it('should not map event if not hearing or inquiry', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.inquiryDate, undefined);
		});
		it('should not map event if written-reps', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.WRITTEN_REPS,
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.inquiryDate, undefined);
		});
		it('should map hearing', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.HEARING,
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, 'd-1');
			assert.strictEqual(result.hearingVenue, 'Some Place');
			assert.strictEqual(result.inquiryDate, undefined);
		});
		it('should map inquiry', () => {
			/** @type {CrownDevelopment} */
			const input = {
				id: 'id-1',
				referenceId: 'reference-id-1',
				procedureId: APPLICATION_PROCEDURE_ID.INQUIRY,
				Event: { date: 'd-1', venue: 'Some Place' }
			};
			const result = crownDevelopmentToViewModel(input);
			assert.strictEqual(result.hearingDate, undefined);
			assert.strictEqual(result.inquiryDate, 'd-1');
			assert.strictEqual(result.inquiryVenue, 'Some Place');
		});
	});
});
