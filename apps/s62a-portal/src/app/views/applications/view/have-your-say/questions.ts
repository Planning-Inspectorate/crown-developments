import {
	REPRESENTATION_SUBMITTED_FOR,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import NameValidator from '@pins/crowndev-lib/validators/name-validator.ts';
import { BOOLEAN_OPTIONS, type Question, RequiredValidator } from '@planning-inspectorate/dynamic-forms';

/**
 * Wording and validation for the S62A Have your say journey that differs from the
 * shared representation questions (which Crown and the back office also use).
 */
export const HAVE_YOUR_SAY_PROP_OVERRIDES = {
	submittedFor: {
		options: REPRESENTATION_SUBMITTED_FOR.map(({ id, displayName }) => ({
			value: id,
			text:
				id === REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF
					? 'On behalf of another person, an organisation or group of people'
					: displayName
		}))
	},
	myselfFullName: {
		inputFields: [
			{ fieldName: 'myselfFirstName', label: 'First name', autocomplete: 'given-name', formatJoinString: ' ' },
			{ fieldName: 'myselfLastName', label: 'Last name', autocomplete: 'family-name' }
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: 'myselfFirstName',
						validators: [
							new RequiredValidator('Enter your first name'),
							new NameValidator({ label: 'First name', allowNumbers: true })
						]
					},
					{
						fieldName: 'myselfLastName',
						validators: [
							new RequiredValidator('Enter your last name'),
							new NameValidator({ label: 'Last name', allowNumbers: true })
						]
					}
				]
			})
		]
	},
	myselfEmail: {
		hint: 'We will only use this email address to contact you about your representation if we need to. We will not publish your email address.'
	},
	myselfHasAttachments: {
		question: 'Have you got attachments to support your comment?',
		hint: 'Include any relevant attachments such as reports, photographs or previous submissions',
		options: [
			{ text: 'Yes, I have attachments to upload first', value: BOOLEAN_OPTIONS.YES },
			{ text: 'No, I do not have attachments to upload', value: BOOLEAN_OPTIONS.NO }
		],
		validators: [new RequiredValidator('Select yes if there are any attachments')]
	}
};

/**
 * The questions for the S62A Have your say journey
 */
export function getHaveYourSayQuestions(): Record<string, Question> {
	return getQuestions({
		textOverrides: { appName: 'portal' },
		isPortal: true,
		isS62a: true,
		propOverrides: HAVE_YOUR_SAY_PROP_OVERRIDES
	});
}
