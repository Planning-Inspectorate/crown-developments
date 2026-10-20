import assert from 'node:assert';
import { describe, it } from 'node:test';
import type MultiFileUploadQuestion from '@pins/crowndev-lib/forms/custom-components/multi-file-uploader/question.ts';
import type { Question } from '@planning-inspectorate/dynamic-forms';
import { buildValidateBody } from '@planning-inspectorate/dynamic-forms/src/validator/validator.js';
import { validationResult } from 'express-validator';
import { getHaveYourSayQuestions, groupMemberOverrides, MAXIMUM_GROUP_MEMBERS } from './questions.ts';

const questions = getHaveYourSayQuestions();

/** Runs a question's validators the way the journey does, and returns the error messages in order */
async function validationErrors(question: Question, body: Record<string, string>): Promise<string[]> {
	const req = { body };
	await buildValidateBody([question])(req as never, {} as never, () => {});
	return validationResult(req)
		.array()
		.map((error) => String(error.msg));
}

const applicationId = '123e4567-e89b-12d3-a456-426614174000';

/** Runs the upload page's validators, with the uploaded files in the session as the upload routes leave them */
async function uploadValidationErrors(
	question: Question,
	files: Record<string, unknown> | undefined
): Promise<string[]> {
	const req = { body: {}, params: { applicationId, section: 'myself', question: 'attachments' }, session: { files } };
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

	describe('upload supporting attachments', () => {
		for (const prefix of ['myself', 'submitter'] as const) {
			const question = questions[`${prefix}SelectBlobAttachments`] as MultiFileUploadQuestion;

			it(`should show the ${prefix} upload page as per the ticket (Scenario 1)`, () => {
				assert.strictEqual(question.question, 'Upload supporting attachments');
				assert.strictEqual(question.url, 'attachments');
				assert.strictEqual(
					question.preUploadHtml,
					'views/applications/view/have-your-say/upload-attachments-guidance.njk'
				);
				assert.strictEqual(question.filesAddedText, 'Attachments added');
				assert.strictEqual(question.dropzoneButtonText, 'Choose attachments');
				assert.strictEqual(question.dropzoneHintText, 'Drag and drop attachments here or');
				assert.strictEqual(question.submitButtonText, 'Continue');
			});
			it(`should allow 3 ${prefix} attachments at a time, each under 20MB (Scenarios 6 and 7)`, () => {
				assert.strictEqual(question.maximumFilesPerUpload, 3);
				assert.strictEqual(question.maximumFilesPerUploadMessage, 'You can only upload 3 attachments at a time');
				assert.strictEqual(question.maxFileSizeValue, 20 * 1024 * 1024);
				assert.strictEqual(question.maxFileSizeString, '20MB');
			});
			it(`should need a ${prefix} attachment uploaded to continue (Scenario 9)`, async () => {
				const uploaded = (uploadedFiles: unknown[]) =>
					uploadValidationErrors(question, { [applicationId]: { attachments: { uploadedFiles } } });

				assert.deepStrictEqual(await uploadValidationErrors(question, undefined), ['Select an attachment to upload']);
				assert.deepStrictEqual(await uploaded([]), ['Select an attachment to upload']);
				assert.deepStrictEqual(await uploaded([{ itemId: 'draft-1', fileName: 'report.pdf' }]), []);
			});
		}
	});

	describe('agent pages', () => {
		it('should ask whether you are an agent, and need an answer', async () => {
			const question = questions.isAgent;
			assert.strictEqual(question.question, 'Are you acting as an agent on behalf of a client?');
			assert.strictEqual(
				question.hint,
				'For example, your organisation has been hired to represent a client on planning matters.'
			);
			assert.deepStrictEqual(await validationErrors(question, {}), [
				'Select yes if you are acting as an agent on behalf of a client'
			]);
		});
		it('should ask for the agent organisation, up to 250 characters', async () => {
			const question = questions.agentOrgName;
			assert.strictEqual(question.question, 'What is the name of the organisation you work for?');
			assert.deepStrictEqual(await validationErrors(question, { agentOrgName: '' }), ['Enter your organisation name']);
			assert.deepStrictEqual(await validationErrors(question, { agentOrgName: 'A'.repeat(251) }), [
				'Name of your organisation must be 250 characters or less'
			]);
		});
	});

	describe('your name and email on the on behalf of routes, as for Myself (PEAS-102 Scenario 2)', () => {
		it('should use the Myself wording and validation for your name', async () => {
			const question = questions.submitterFullName;
			assert.strictEqual(question.question, 'What is your name?');
			assert.deepStrictEqual(await validationErrors(question, { submitterFirstName: '', submitterLastName: 'D@e' }), [
				'Enter your first name',
				'Last name must only include letters, spaces, hyphens, apostrophes or numbers'
			]);
		});
		it('should use the Myself wording and validation for your email', async () => {
			const question = questions.submitterEmail;
			assert.strictEqual(question.hint, questions.myselfEmail.hint);
			assert.deepStrictEqual(await validationErrors(question, { submitterEmail: '' }), ['Enter your email address']);
		});
		it('should use the Myself attachments question', async () => {
			const question = questions.submitterHasAttachments;
			assert.strictEqual(question.question, 'Have you got attachments to support your comment?');
			assert.deepStrictEqual(await validationErrors(question, {}), ['Select yes if there are any attachments']);
		});
	});

	describe('does the group have a name (PEAS-102 Scenarios 3-5)', () => {
		const question = questions.hasGroupName;

		it('should show the question and hint', () => {
			assert.strictEqual(question.question, 'Does the group have a name?');
			assert.strictEqual(question.hint, "For example, a resident's association or a local community group.");
		});
		it('should need an answer', async () => {
			assert.deepStrictEqual(await validationErrors(question, {}), ['Select yes if the group has a name']);
		});
	});

	describe('group name (PEAS-102 Scenarios 7-8)', () => {
		const question = questions.groupName;

		it('should show the question and hint', () => {
			assert.strictEqual(question.question, 'What is the name of the group?');
			assert.strictEqual(question.hint, "For example, a resident's association or a local community group.");
		});
		it('should need a name of 3 to 250 characters', async () => {
			assert.deepStrictEqual(await validationErrors(question, { groupName: '' }), ['Enter the name of the group']);
			for (const groupName of ['ab', 'A'.repeat(251)]) {
				assert.deepStrictEqual(await validationErrors(question, { groupName }), [
					'Group name must be between 3 and 250 characters'
				]);
			}
			assert.deepStrictEqual(await validationErrors(question, { groupName: 'abc' }), []);
		});
	});

	describe('check group name details (PEAS-102 Scenarios 13-18)', () => {
		// the table add-to-list options are typed on the custom class, not on Question
		const list = questions.manageGroupDetails as unknown as Record<string, unknown>;

		it('should show the list with an Add another person link and immediate removal', () => {
			assert.strictEqual(list.question, 'Check group name details');
			assert.strictEqual(list.addAnotherLinkText, 'Add another person');
			assert.strictEqual(list.removeWithoutConfirmation, true);
			assert.strictEqual(list.hideRemoveOnLastItem, true);
		});
		it('should allow up to 10 people, and list them all on check your answers', () => {
			assert.strictEqual(MAXIMUM_GROUP_MEMBERS, 10);
			assert.strictEqual(list.maximumAnswers, MAXIMUM_GROUP_MEMBERS);
			assert.strictEqual(list.summaryLimit, MAXIMUM_GROUP_MEMBERS);
		});
	});

	describe('person in the group (PEAS-102 Scenarios 10-17)', () => {
		it('should ask for the first person, with a hint, when no-one has been added', () => {
			const overrides = groupMemberOverrides({ manageListAction: 'add', otherMembers: 0 });
			assert.strictEqual(overrides.question, 'What is the name of the first person you are representing?');
			assert.strictEqual(overrides.hint, 'You will be able to add more people on the next page.');
		});
		it('should ask for the next person once someone has been added', () => {
			const overrides = groupMemberOverrides({ manageListAction: 'add', otherMembers: 1 });
			assert.strictEqual(overrides.question, 'What is the name of the next person you are representing?');
			assert.strictEqual(overrides.hint, undefined);
		});
		it("should say Change the person's name when changing someone", () => {
			const overrides = groupMemberOverrides({ manageListAction: 'edit', otherMembers: 0 });
			assert.strictEqual(overrides.question, "Change the person's name");
		});
		it('should be the question used for the person page', () => {
			const next = getHaveYourSayQuestions({ manageListAction: 'add', otherMembers: 2 });
			assert.strictEqual(
				next.groupRepresentedFullName.question,
				'What is the name of the next person you are representing?'
			);
		});
		it('should need both names, up to 250 characters, with accepted characters', async () => {
			const question = questions.groupRepresentedFullName;
			const errors = (groupRepresentedFirstName: string, groupRepresentedLastName: string) =>
				validationErrors(question, { groupRepresentedFirstName, groupRepresentedLastName });

			assert.deepStrictEqual(await errors('', ''), ['Enter a first name', 'Enter a last name']);

			assert.deepStrictEqual(await errors('A'.repeat(251), 'D@e'), [
				'First name must be between 1 and 250 characters',
				'Last name must only include letters, spaces, hyphens, apostrophes or numbers'
			]);
			assert.deepStrictEqual(await errors('Ann 2', "O'Lee"), []);
		});
	});
});
