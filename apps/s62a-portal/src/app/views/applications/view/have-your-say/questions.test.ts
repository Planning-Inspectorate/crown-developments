import assert from 'node:assert';
import { describe, it } from 'node:test';
import type { Question } from '@planning-inspectorate/dynamic-forms';
import { buildValidateBody } from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationResult } from 'express-validator';
import { getHaveYourSayQuestions } from './questions.ts';

const questions = getHaveYourSayQuestions();

/** Runs a question's validators the way the journey does, and returns the error messages in order */
async function validationErrors(question: Question, body: Record<string, string>): Promise<string[]> {
	const req = { body };
	await buildValidateBody([question])(req as never, {} as never, () => {});
	return validationResult(req)
		.array()
		.map((error) => String(error.msg));
}

/** Options are typed loosely upstream */
function optionTexts(question: Question): string[] {
	return (question as unknown as { options: { text: string }[] }).options.map((option) => option.text);
}

describe('have your say questions', () => {
	describe('who are you submitting for (Scenarios 1 and 3)', () => {
		const question = questions.submittedFor;

		it('should use the portal wording and options', () => {
			assert.strictEqual(question.question, 'Who are you submitting a representation for?');
			assert.deepStrictEqual(optionTexts(question), [
				'Myself',
				'On behalf of another person, an organisation or group of people'
			]);
		});
		it('should be mandatory', async () => {
			assert.deepStrictEqual(await validationErrors(question, {}), ['Select who you are submitting for']);
		});
	});

	describe('what is your name (Scenarios 4 and 5)', () => {
		const question = questions.myselfFullName;
		const errors = (myselfFirstName: string, myselfLastName: string) =>
			validationErrors(question, { myselfFirstName, myselfLastName });

		it('should use the portal wording', () => {
			assert.strictEqual(question.question, 'What is your name?');
			assert.strictEqual(
				question.hint,
				'We’ll publish your name on the website along with your written representation.'
			);
		});
		it('should need both names', async () => {
			assert.deepStrictEqual(await errors('', ''), ['Enter your first name', 'Enter your last name']);
		});
		it('should allow up to 250 characters', async () => {
			assert.deepStrictEqual(await errors('A'.repeat(251), 'B'.repeat(251)), [
				'First name must be between 1 and 250 characters',
				'Last name must be between 1 and 250 characters'
			]);
			assert.deepStrictEqual(await errors('A'.repeat(250), 'B'.repeat(250)), []);
		});
		it('should only allow letters, spaces, hyphens, apostrophes and numbers', async () => {
			assert.deepStrictEqual(await errors('J@ne', 'Doe!'), [
				'First name must only include letters, spaces, hyphens, apostrophes or numbers',
				'Last name must only include letters, spaces, hyphens, apostrophes or numbers'
			]);
			assert.deepStrictEqual(await errors('Jane 2', "O'Doe-Smith"), []);
		});
	});

	describe('what is your email address (Scenarios 7 and 8)', () => {
		const question = questions.myselfEmail;

		it('should use the portal wording', () => {
			assert.strictEqual(question.question, 'What is your email address?');
			assert.strictEqual(
				question.hint,
				'We will only use this email address to contact you about your representation if we need to. We will not publish your email address.'
			);
		});
		it('should be mandatory', async () => {
			assert.deepStrictEqual(await validationErrors(question, { myselfEmail: '' }), ['Enter your email address']);
		});
		it('should keep the format check', async () => {
			assert.deepStrictEqual(await validationErrors(question, { myselfEmail: 'not-an-email' }), [
				'Enter an email address in the correct format, like name@example.com'
			]);
			assert.deepStrictEqual(await validationErrors(question, { myselfEmail: 'jane@example.com' }), []);
		});
	});

	describe('have you got attachments (Scenarios 10 and 13)', () => {
		const question = questions.myselfHasAttachments;

		it('should use the portal wording and options', () => {
			assert.strictEqual(question.question, 'Have you got attachments to support your comment?');
			assert.strictEqual(
				question.hint,
				'Include any relevant attachments such as reports, photographs or previous submissions'
			);
			assert.deepStrictEqual(optionTexts(question), [
				'Yes, I have attachments to upload first',
				'No, I do not have attachments to upload'
			]);
		});
		it('should be mandatory', async () => {
			assert.deepStrictEqual(await validationErrors(question, {}), ['Select yes if there are any attachments']);
		});
	});
});
