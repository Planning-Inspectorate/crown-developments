import {
	REPRESENTATION_SUBMITTED_FOR,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { AjaxDocumentUploadValidator } from '@pins/crowndev-lib/forms/custom-components/ajax-document-upload-validator/ajax-document-uploader-validator.ts';
import { getQuestions } from '@pins/crowndev-lib/forms/representations/questions.js';
import MultiFieldInputValidator from '@pins/crowndev-lib/validators/multi-field-input-validator.js';
import NameValidator from '@pins/crowndev-lib/validators/name-validator.ts';
import { CharacterLimitValidator } from '@pins/crowndev-lib/validators/character-limit-validator.ts';
import {
	BOOLEAN_OPTIONS,
	COMPONENT_TYPES,
	MANAGE_LIST_ACTIONS,
	type Question,
	RequiredValidator,
	StringValidator
} from '@planning-inspectorate/dynamic-forms';
import { ATTACHMENT_ERRORS, MAXIMUM_ATTACHMENTS_PER_UPLOAD } from './attachments.ts';

/** Most people that can be added to a group */
export const MAXIMUM_GROUP_MEMBERS = 10;

/**
 * The 'your name' question, used for both the myself and on behalf of routes
 */
function yourNameOverrides(prefix: 'myself' | 'submitter') {
	return {
		inputFields: [
			{ fieldName: `${prefix}FirstName`, label: 'First name', autocomplete: 'given-name', formatJoinString: ' ' },
			{ fieldName: `${prefix}LastName`, label: 'Last name', autocomplete: 'family-name' }
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: `${prefix}FirstName`,
						validators: [
							new RequiredValidator('Enter your first name'),
							new NameValidator({ label: 'First name', allowNumbers: true })
						]
					},
					{
						fieldName: `${prefix}LastName`,
						validators: [
							new RequiredValidator('Enter your last name'),
							new NameValidator({ label: 'Last name', allowNumbers: true })
						]
					}
				]
			})
		]
	};
}

const yourEmailOverrides = {
	// check your answers would show jane@example.com as Jane@example.com
	capitaliseAnswer: false,
	hint: 'We will only use this email address to contact you about your representation if we need to. We will not publish your email address.'
};

const hasAttachmentsOverrides = {
	// the check your answers row
	title: 'Have you got attachments?',
	question: 'Have you got attachments to support your comment?',
	hint: 'Include any relevant attachments such as reports, photographs or previous submissions',
	options: [
		{ text: 'Yes, I have attachments to upload first', value: BOOLEAN_OPTIONS.YES },
		{ text: 'No, I do not have attachments to upload', value: BOOLEAN_OPTIONS.NO }
	],
	validators: [new RequiredValidator('Select yes if there are any attachments')]
};

/**
 * The upload supporting attachments page
 */
function selectAttachmentsOverrides(prefix: 'myself' | 'submitter') {
	return {
		preUploadHtml: 'views/applications/view/have-your-say/upload-attachments-guidance.njk',
		validators: [new AjaxDocumentUploadValidator(`${prefix}BlobAttachments`, ATTACHMENT_ERRORS.noAttachment)],
		maximumFilesPerUpload: MAXIMUM_ATTACHMENTS_PER_UPLOAD,
		maximumFilesPerUploadMessage: ATTACHMENT_ERRORS.tooManyFiles,
		dropzoneHintText: 'Drag and drop attachments here or',
		dropzoneButtonText: 'Choose attachments',
		submitButtonText: 'Continue',
		// the portal can't download drafts, so check your answers lists the names without links
		linkFilesInSummary: false
	};
}

export const MAXIMUM_COMMENT_LENGTH = 65000;

/**
 * The 'What do you want to say about this application?' page
 */
const commentOverrides = {
	// the back office hint asks people to say in their comment if they want a hearing; the portal has a page for that
	hint: undefined,
	html: 'views/applications/view/have-your-say/comment-guidance.njk',
	characterCountMaxLength: MAXIMUM_COMMENT_LENGTH,
	validators: [
		new RequiredValidator('Enter what you want to tell us about this proposed application'),
		new CharacterLimitValidator(MAXIMUM_COMMENT_LENGTH)
	]
};

/**
 * The 'Register interest to attend hearing' page. A radio rather than the back office's
 * Yes/No question, as only the radio can show a page heading, guidance and a separate question.
 * The answers are still 'yes' and 'no'.
 */
const hearingOverrides = {
	type: COMPONENT_TYPES.RADIO,
	// the check your answers row
	title: 'Attend hearing?',
	question: 'Register interest to attend hearing',
	legend: 'Do you want to register interest in attending a hearing?',
	html: 'views/applications/view/have-your-say/hearing-guidance.njk',
	options: [
		{ text: 'Yes', value: BOOLEAN_OPTIONS.YES },
		{ text: 'No', value: BOOLEAN_OPTIONS.NO }
	],
	validators: [new RequiredValidator('Select yes if you want to register interest to attend a hearing')]
};

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
	myselfFullName: yourNameOverrides('myself'),
	myselfEmail: yourEmailOverrides,
	myselfHasAttachments: hasAttachmentsOverrides,
	myselfSelectBlobAttachments: selectAttachmentsOverrides('myself'),
	myselfTellUsAboutApplication: commentOverrides,
	myselfHearingPreference: hearingOverrides,

	submitterFullName: yourNameOverrides('submitter'),
	submitterEmail: yourEmailOverrides,
	submitterHasAttachments: hasAttachmentsOverrides,
	submitterSelectBlobAttachments: selectAttachmentsOverrides('submitter'),
	submitterTellUsAboutApplication: commentOverrides,
	submitterHearingPreference: hearingOverrides,

	orgName: {
		validators: [
			new RequiredValidator('Enter the name of your organisation or charity'),
			new StringValidator({
				maxLength: {
					maxLength: 250,
					maxLengthMessage: 'Name of organisation or charity must be between 1 and 250 characters'
				}
			})
		]
	},

	representedFullName: {
		// someone else's name, so the browser should not fill in the user's own
		inputFields: [
			{ fieldName: 'representedFirstName', label: 'First name', autocomplete: 'off', formatJoinString: ' ' },
			{ fieldName: 'representedLastName', label: 'Last name', autocomplete: 'off' }
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: 'representedFirstName',
						validators: [
							new RequiredValidator('Enter a first name'),
							new NameValidator({ label: 'First name', allowNumbers: true })
						]
					},
					{
						fieldName: 'representedLastName',
						validators: [
							new RequiredValidator('Enter a last name'),
							new NameValidator({ label: 'Last name', allowNumbers: true })
						]
					}
				]
			})
		]
	},

	groupName: {
		question: 'What is the name of the group?',
		validators: [
			new RequiredValidator('Enter the name of the group'),
			new StringValidator({
				minLength: { minLength: 3, minLengthMessage: 'Group name must be between 3 and 250 characters' },
				maxLength: { maxLength: 250, maxLengthMessage: 'Group name must be between 3 and 250 characters' }
			})
		]
	},
	manageGroupDetails: {
		maximumAnswers: MAXIMUM_GROUP_MEMBERS,
		// everyone is listed on check your answers
		summaryLimit: MAXIMUM_GROUP_MEMBERS,
		hideRemoveOnLastItem: true,
		removeWithoutConfirmation: true,
		addAnotherLinkText: 'Add another person'
	}
};

/**
 * Where the person is in the group's add-to-list, which decides the heading of the person page
 */
export interface GroupMemberPageState {
	/** 'add' or 'edit' when on a person page inside the add-to-list */
	manageListAction?: string;
	/** how many people are in the group, not counting the one on this page */
	otherMembers: number;
}

/**
 * The person page has three headings for one question: the first person, each next person,
 * and changing someone already added.
 */
export function groupMemberOverrides({ manageListAction, otherMembers }: GroupMemberPageState) {
	const labels = {
		inputFields: [
			{
				fieldName: 'groupRepresentedFirstName',
				label: 'First name',
				// someone else's name, so the browser should not fill in the user's own
				autocomplete: 'off',
				formatJoinString: ' '
			},
			{ fieldName: 'groupRepresentedLastName', label: 'Last name', autocomplete: 'off' }
		],
		validators: [
			new MultiFieldInputValidator({
				fields: [
					{
						fieldName: 'groupRepresentedFirstName',
						validators: [
							new RequiredValidator('Enter a first name'),
							new NameValidator({ label: 'First name', allowNumbers: true })
						]
					},
					{
						fieldName: 'groupRepresentedLastName',
						validators: [
							new RequiredValidator('Enter a last name'),
							new NameValidator({ label: 'Last name', allowNumbers: true })
						]
					}
				]
			})
		]
	};

	if (manageListAction === MANAGE_LIST_ACTIONS.EDIT) {
		return { ...labels, question: "Change the person's name", hint: undefined };
	}

	if (otherMembers === 0) {
		return {
			...labels,
			question: 'What is the name of the first person you are representing?',
			hint: 'You will be able to add more people on the next page.'
		};
	}

	return { ...labels, question: 'What is the name of the next person you are representing?', hint: undefined };
}

/**
 * The questions for the S62A Have your say journey
 */
export function getHaveYourSayQuestions(
	groupMemberPage: GroupMemberPageState = { otherMembers: 0 }
): Record<string, Question> {
	return getQuestions({
		textOverrides: { appName: 'portal' },
		isPortal: true,
		isS62a: true,
		propOverrides: {
			...HAVE_YOUR_SAY_PROP_OVERRIDES,
			groupRepresentedFullName: groupMemberOverrides(groupMemberPage)
		}
	});
}
