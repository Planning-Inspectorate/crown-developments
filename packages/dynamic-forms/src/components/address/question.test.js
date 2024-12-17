import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import AddressQuestion from './question.js';
import { Address } from '../../lib/address.js';

describe('AddressQuestion', () => {
	const TITLE = 'What is the site address?';
	const QUESTION = 'Enter the site address details:';
	const FIELDNAME = 'siteAddress';
	const VIEWFOLDER = 'address-entry';
	const VALIDATORS = [];

	const testAddress = {
		addressLine1: '123 Main St',
		addressLine2: 'Floor 2',
		townCity: 'Testville',
		postcode: 'TE1 2ST',
		county: 'Testshire'
	};

	const setup = () => {
		const question = new AddressQuestion({
			title: TITLE,
			question: QUESTION,
			fieldName: FIELDNAME,
			viewFolder: VIEWFOLDER,
			validators: VALIDATORS
		});

		const mockApi = {
			postSubmissionAddress: mock.fn(() => {}),
			updateAppellantSubmission: mock.fn()
		};

		const req = {
			body: {
				siteAddress_addressLine1: '123 Main St',
				siteAddress_addressLine2: 'Floor 2',
				siteAddress_townCity: 'Testville',
				siteAddress_postcode: 'TE1 2ST',
				siteAddress_county: 'Testshire',
				fieldName: FIELDNAME
			},
			appealsApiClient: mockApi
		};

		const journeyResponse = {
			journeyId: 'journey123',
			referenceId: '1234',
			answers: {}
		};
		return { question, mockApi, req, journeyResponse };
	};

	describe('getDataToSave', () => {
		it('should format the data correctly to be saved', async () => {
			const { question, req } = setup();
			const expectedAddress = new Address(testAddress);

			const journeyResponse = {
				answers: {}
			};

			const { answers } = await question.getDataToSave(req, journeyResponse);

			for (const [k] of Object.entries(testAddress)) {
				assert.strictEqual(answers[FIELDNAME][k], expectedAddress[k]);
			}
		});
	});

	describe('format', () => {
		it('should return formatted address from answer', () => {
			const { question } = setup();
			const formattedAddress = question.format(testAddress);
			assert.strictEqual(formattedAddress, '123 Main St\nFloor 2\nTestville\nTestshire\nTE1 2ST');
		});
	});

	describe('prepQuestionForRendering', () => {
		it('should format data for the view model', async () => {
			const { question } = setup();

			const journeyResponse = {
				answers: {
					[FIELDNAME]: testAddress
				}
			};

			const model = await question.prepQuestionForRendering(
				{},
				{
					getNextQuestionUrl: mock.fn(),
					response: journeyResponse
				}
			);
			for (const k of Object.keys(testAddress)) {
				assert.strictEqual(model.question.value[k], testAddress[k]);
			}
		});
	});
});
