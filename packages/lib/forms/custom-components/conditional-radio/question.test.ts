import { describe, it } from 'node:test';
import assert from 'node:assert';
import ConditionalRadioQuestion, { type ConditionalRadioQuestionProps } from './question.ts';
import type { Journey } from '@planning-inspectorate/dynamic-forms';

describe('ConditionalRadioQuestion', () => {
	const questionProps: ConditionalRadioQuestionProps = {
		title: 'Contact Type',
		question: 'What is your contact type?',
		fieldName: 'contactType',
		url: 'contact-type',
		options: [
			{ text: 'Agent', value: 'agent' },
			{ text: 'Interested party', value: 'interested-party' },
			{ text: 'Other', value: 'other' }
		],
		conditionalTriggerValue: 'other',
		conditionalDbFieldName: 'otherContactType'
	};

	const question = new ConditionalRadioQuestion(questionProps);

	question.getAction = () => {
		return { href: '/mock-action-url', text: 'Change' };
	};

	it('should retain the specific conditional properties', () => {
		assert.strictEqual(question.conditionalTriggerValue, 'other');
		assert.strictEqual(question.conditionalDbFieldName, 'otherContactType');
	});

	it('should format answer for summary without conditional text if the trigger value is not selected', () => {
		const mockJourney = {
			response: {
				answers: {
					contactType: 'agent'
				}
			}
		};

		const result = question.formatAnswerForSummary('segment', mockJourney as unknown as Journey, 'agent');

		assert.strictEqual(result[0].key, 'Contact Type');
		assert.strictEqual(result[0].value, 'Agent');
		assert.deepEqual(result[0].action, { href: '/mock-action-url', text: 'Change' });
	});

	it('should format answer for summary with the custom text if the conditional trigger is selected', () => {
		const mockJourney = {
			response: {
				answers: {
					contactType: 'other',
					contactType_otherContactType: 'Local MP'
				}
			}
		};

		const result = question.formatAnswerForSummary('segment', mockJourney as unknown as Journey, 'other');

		assert.strictEqual(result[0].key, 'Contact Type');
		assert.strictEqual(result[0].value, 'Other: Local MP');
		assert.deepEqual(result[0].action, { href: '/mock-action-url', text: 'Change' });
	});

	it('should format answer gracefully if the option does not exist', () => {
		const mockJourney = {
			response: {
				answers: {
					contactType: 'does_not_exist'
				}
			}
		};

		const result = question.formatAnswerForSummary('segment', mockJourney as unknown as Journey, 'does_not_exist');

		assert.strictEqual(result[0].value, '-');
	});
});
