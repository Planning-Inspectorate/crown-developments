import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatDate, isInquiry, isHearing, applicationLinks, mapDevelopmentToViewModel } from './shared-view-model.ts';
import type { BaseDevelopmentView, BaseDevelopmentPayload } from './shared-view-model.ts';
import { APPLICATION_PROCEDURE_ID } from '@pins/crowndev-database/src/seed/data-static.ts';

describe('Application Utilities', () => {
	describe('formatDate', () => {
		void it('should pass the Date object and options through to the underlying formatter', () => {
			const testDate = new Date('2026-06-12');
			const options = { format: 'dd/MM/yyyy' };

			const result = formatDate(testDate, options);
			assert.strictEqual(typeof result, 'string');
		});

		it('should handle null by casting it to undefined', () => {
			const result = formatDate(null);
			assert.strictEqual(typeof result, 'string');
		});

		it('should handle undefined parameters', () => {
			const result = formatDate(undefined);
			assert.strictEqual(typeof result, 'string');
		});
	});

	describe('isInquiry', () => {
		it('should return true when procedureId matches INQUIRY', () => {
			assert.strictEqual(isInquiry(APPLICATION_PROCEDURE_ID.INQUIRY), true);
		});

		it('should return false when procedureId does not match INQUIRY', () => {
			assert.strictEqual(isInquiry('SOME_OTHER_ID'), false);
		});

		it('should return false when procedureId is null', () => {
			assert.strictEqual(isInquiry(null), false);
		});
	});

	describe('isHearing', () => {
		it('should return true when procedureId matches HEARING', () => {
			assert.strictEqual(isHearing(APPLICATION_PROCEDURE_ID.HEARING), true);
		});

		it('should return false when procedureId does not match HEARING', () => {
			assert.strictEqual(isHearing('SOME_OTHER_ID'), false);
		});

		it('should return false when procedureId is null', () => {
			assert.strictEqual(isHearing(null), false);
		});
	});

	describe('applicationLinks', () => {
		it('should include Have your say when within the representation submission period', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

			/** @type {{start: Date, end: Date}} */
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, false);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				},
				{
					href: `/applications/${id}/documents`,
					text: 'Documents'
				},
				{
					href: `/applications/${id}/have-your-say`,
					text: 'Have your say'
				},
				{
					href: `/applications/${id}/written-representations`,
					text: 'Written representations'
				}
			]);
		});
		it('should include application updates when present on crown dev application', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T03:24:00.000Z') });

			/** @type {{start: Date, end: Date}} */
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				},
				{
					href: `/applications/${id}/documents`,
					text: 'Documents'
				},
				{
					href: `/applications/${id}/have-your-say`,
					text: 'Have your say'
				},
				{
					href: `/applications/${id}/application-updates`,
					text: 'Application updates'
				},
				{
					href: `/applications/${id}/written-representations`,
					text: 'Written representations'
				}
			]);
		});
		it('should not include Have your say when outside the representation submission period or Written Representations when now before representations publish date', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-31T00:00:00.000Z') });
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-02-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, false);
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				},
				{
					href: `/applications/${id}/documents`,
					text: 'Documents'
				}
			]);
		});
		it('should show all links if applicationStatus is active', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-15T12:00:00.000Z') }); // within period
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined);
			assert(result.some((link) => link.text === 'Documents'));
			assert(result.some((link) => link.text === 'Have your say'));
			assert(result.some((link) => link.text === 'Application updates'));
			assert(result.some((link) => link.text === 'Written representations'));
		});

		it('should not include have your say link when applicationStatus is withdrawn', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-15T12:00:00.000Z') }); // within period
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, 'withdrawn');
			assert.deepStrictEqual(result, [
				{ href: `/applications/${id}/application-information`, text: 'Application information' },
				{ href: `/applications/${id}/documents`, text: 'Documents' },
				{ href: `/applications/${id}/application-updates`, text: 'Application updates' },
				{ href: `/applications/${id}/written-representations`, text: 'Written representations' }
			]);
		});
		it('should only show Application information link when applicationStatus is expired', () => {
			const id = 'id-1';
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, 'expired');
			assert.deepStrictEqual(result, [
				{
					href: `/applications/${id}/application-information`,
					text: 'Application information'
				}
			]);
		});
		it('should default to showing all links when applicationStatus is undefined', (context) => {
			const id = 'id-1';
			context.mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-15T12:00:00.000Z') }); // within period
			const haveYourSayPeriod = {
				start: new Date('2025-01-01T00:00:00.000Z'),
				end: new Date('2025-01-30T23:59:59.000Z')
			};
			const representationsPublishDate = new Date('2025-01-01T00:00:00.000Z');
			const result = applicationLinks(id, haveYourSayPeriod, representationsPublishDate, true, undefined);
			assert.deepStrictEqual(result, [
				{ href: `/applications/${id}/application-information`, text: 'Application information' },
				{ href: `/applications/${id}/documents`, text: 'Documents' },
				{ href: `/applications/${id}/have-your-say`, text: 'Have your say' },
				{ href: `/applications/${id}/application-updates`, text: 'Application updates' },
				{ href: `/applications/${id}/written-representations`, text: 'Written representations' }
			]);
		});
	});

	describe('mapDevelopmentToViewModel', () => {
		const mockDevelopment: BaseDevelopmentPayload = {
			id: 'dev-123',
			reference: 'REF-2026-XYZ',
			description: 'Description goes here',
			Type: {
				displayName: 'Planning permission'
			},
			Lpa: {
				name: 'Test LPA'
			},
			Stage: {
				displayName: 'Inquiry'
			},
			SecondaryLpa: {
				id: 'secondary-lpa-1',
				name: 'Secondary Test LPA',
				email: null,
				telephoneNumber: null,
				addressId: null,
				pinsCode: null,
				onsCode: null
			},
			Organisations: [
				{
					id: 'org-1',
					organisationId: 'org-1',
					crownDevelopmentId: 'dev-123',
					role: 'applicant',
					Organisation: { name: 'Applicant organisation 1' }
				},
				{
					id: 'org-2',
					organisationId: 'org-2',
					crownDevelopmentId: 'dev-123',
					role: 'applicant',
					Organisation: { name: 'Applicant organisation 2' }
				}
			]
		};

		it('should correctly map base fields and merge additional fields from the formatting function', () => {
			const email = 'test@example.com';

			const mockFormatter = (input: BaseDevelopmentPayload) => ({
				extraParameter: 'Special formatting logic output'
			});

			const expected = {
				id: 'dev-123',
				reference: 'REF-2026-XYZ',
				description: 'Description goes here',
				developmentContactEmail: 'test@example.com',
				lpaName: 'Test LPA',
				stage: 'Inquiry',
				secondaryLpa: 'Secondary Test LPA',
				extraParameter: 'Special formatting logic output'
			};

			const result = mapDevelopmentToViewModel(mockDevelopment, email, mockFormatter);

			console.log(result);

			assert.deepStrictEqual(result, expected);
		});
		it('should protect base fields from being overwritten by the formatting function', () => {
			const email = 'test@planninginspectorate.gov.uk';

			const mockFormatter = (input: BaseDevelopmentPayload) => ({
				id: 'Incorrect ID',
				description: 'Wrong Description',
				extraParameter: 'Valid extra parameter'
			});

			const result = mapDevelopmentToViewModel(mockDevelopment, email, mockFormatter);

			assert.strictEqual(result.id, 'dev-123');
			assert.strictEqual(result.description, 'Description goes here');

			assert.strictEqual(result.extraParameter, 'Valid extra parameter');
		});

		it('should handle undefined contact email gracefully', () => {
			interface TestDevelopmentListItem extends BaseDevelopmentPayload {
				customProp1: string;
				customProp2: string;
			}

			interface TestDevelopmentView extends BaseDevelopmentView {
				developmentContactEmail: string;
				testField1?: string;
				testField2?: string;
			}

			const specializedMockDevelopment: TestDevelopmentListItem = {
				id: 'dev-123',
				reference: 'REF-2026-XYZ',
				Type: { displayName: 'exampleType' },
				Lpa: { name: 'Test LPA' },
				SecondaryLpa: {
					id: 'secondary-lpa-1',
					name: 'Secondary LPA',
					email: null,
					telephoneNumber: null,
					addressId: null,
					pinsCode: null,
					onsCode: null
				},
				description: 'Example description',
				Organisations: [
					{
						id: 'org-1',
						organisationId: 'org-1',
						crownDevelopmentId: 'dev-123',
						role: 'applicant',
						Organisation: { name: 'Applicant organisation 1' }
					}
				],
				Stage: { displayName: 'Inquiry' },
				customProp1: 'Custom field 1',
				customProp2: 'Custom field 2'
			};

			function testViewFormattingFunction(testDevelopments: TestDevelopmentListItem) {
				const extendedFields: Omit<TestDevelopmentView, keyof BaseDevelopmentView | 'developmentContactEmail'> = {
					testField1: testDevelopments.customProp1,
					testField2: testDevelopments.customProp2
				};

				return extendedFields;
			}

			const result = mapDevelopmentToViewModel(specializedMockDevelopment, undefined, testViewFormattingFunction);

			assert.ok('developmentContactEmail' in result);
			assert.strictEqual((result as TestDevelopmentView).developmentContactEmail, undefined);

			assert.strictEqual((result as TestDevelopmentView).testField1, 'Custom field 1');
			assert.strictEqual((result as TestDevelopmentView).testField2, 'Custom field 2');
		});

		it('should ensure that the custom formatting function receives the correct development input', () => {
			let receivedInput: BaseDevelopmentPayload | null = null;

			const trackingFormatter = (input: BaseDevelopmentPayload) => {
				receivedInput = input;
				return { description: 'stub' };
			};

			mapDevelopmentToViewModel(mockDevelopment, undefined, trackingFormatter);

			assert.deepStrictEqual(receivedInput, mockDevelopment);
		});
	});
});
