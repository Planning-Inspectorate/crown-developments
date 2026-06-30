import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
	isApplicationType,
	formatLpaOptions,
	type ApplicantContact,
	type ApplicantOrganisation,
	getApplicantContactsValidator
} from './questions-utils.ts';
import { PRE_APPLICATION_OR_APPLICATION_ID } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';
import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

describe('questions.utils', () => {
	describe('isApplicationType', () => {
		it('should return true for a valid PRE_APPLICATION id', () => {
			const result = isApplicationType(PRE_APPLICATION_OR_APPLICATION_ID.PRE_APPLICATION);
			assert.strictEqual(result, true);
		});

		it('should return true for a valid APPLICATION id', () => {
			const result = isApplicationType(PRE_APPLICATION_OR_APPLICATION_ID.APPLICATION);
			assert.strictEqual(result, true);
		});

		it('should return false for an unknown string', () => {
			const result = isApplicationType('some-random-string');
			assert.strictEqual(result, false);
		});

		it('should return false for null or undefined', () => {
			assert.strictEqual(isApplicationType(null), false);
			assert.strictEqual(isApplicationType(undefined), false);
		});
	});

	describe('formatLpaOptions', () => {
		it('should prepend an empty option to an empty array', () => {
			const lpas: Prisma.LpaCreateInput[] = [];
			const result = formatLpaOptions(lpas);

			assert.strictEqual(result.length, 1);
			assert.deepStrictEqual(result[0], { text: '', value: '' });
		});

		it('should format a list of LPAs and prepend the empty option', () => {
			const mockLpas = [
				{ id: 'lpa-1', name: 'Westminster City Council' },
				{ id: 'lpa-2', name: 'Camden Council' }
			] as Prisma.LpaCreateInput[];

			const result = formatLpaOptions(mockLpas);

			assert.strictEqual(result.length, 3);

			assert.deepStrictEqual(result[0], { text: '', value: '' });

			assert.deepStrictEqual(result[1], { text: 'Westminster City Council', value: 'lpa-1' });
			assert.deepStrictEqual(result[2], { text: 'Camden Council', value: 'lpa-2' });
		});
	});

	describe('validationFunction logic', () => {
		interface ValidatorWithFunction {
			validationFunction: (
				contacts: Partial<ApplicantContact>[],
				applicants: Partial<ApplicantOrganisation>[]
			) => boolean;
		}

		const getValidateFn = () => {
			const validators = getApplicantContactsValidator(false, false);
			const validator = validators[0] as unknown as ValidatorWithFunction;
			return validator.validationFunction;
		};

		it('should return true if contacts or applicants are not arrays', () => {
			const validateFn = getValidateFn();
			assert.strictEqual(validateFn({} as unknown as ApplicantContact[], [] as ApplicantOrganisation[]), true);
			assert.strictEqual(validateFn([] as ApplicantContact[], null as unknown as ApplicantOrganisation[]), true);
		});

		it('should return true when all contacts match an org and all orgs have a contact', () => {
			const validateFn = getValidateFn();
			const contacts = [{ applicantContactOrganisation: 'org-1' }];
			const applicants = [{ id: 'org-1', organisationName: 'Acme Corp' }];

			assert.strictEqual(validateFn(contacts, applicants), true);
		});

		it('should throw an error if a contact belongs to an unknown organisation', () => {
			const validateFn = getValidateFn();
			const contacts = [{ applicantContactOrganisation: 'unknown-org' }];
			const applicants = [{ id: 'org-1', organisationName: 'Acme Corp' }];

			assert.throws(() => validateFn(contacts, applicants), {
				message: 'All applicant contacts must be associated with an applicant organisation'
			});
		});

		it('should throw an error if an organisation has no contacts', () => {
			const validateFn = getValidateFn();
			const contacts = [{ applicantContactOrganisation: 'org-1' }];
			const applicants = [
				{ id: 'org-1', organisationName: 'Acme Corp' },
				{ id: 'org-2', organisationName: 'Stark Industries' }
			];

			assert.throws(() => validateFn(contacts, applicants), { message: 'You must add a contact for Stark Industries' });
		});

		it('should fallback to "this organisation" if organisationName is missing', () => {
			const validateFn = getValidateFn();
			const contacts = [{ applicantContactOrganisation: 'org-1' }];
			const applicants = [{ id: 'org-1' }, { id: 'org-2' }];

			assert.throws(() => validateFn(contacts, applicants), {
				message: 'You must add a contact for this organisation'
			});
		});
	});
});
