import type { Address } from '@planning-inspectorate/dynamic-forms/src/lib/address.js';
import type { YesNo } from '../../util/types.ts';
/**
 * The view model used for have-your-say answers
 */
export type HaveYourSayViewModel = HaveYourSay.Common & (HaveYourSay.Myself | HaveYourSay.OnBehalfOf);

/**
 * The view model used for have-your-say review & view in the manage app
 */
export type HaveYourSayManageModel = HaveYourSayViewModel & HaveYourSay.InternalFields;

export type HaveYourSayManageModelFields = keyof HaveYourSayManageModel;

export namespace HaveYourSay {
	/**
	 * Common have-your-say fields for all journeys
	 */
	export interface Common {
		submittedForId: string;
	}

	/**
	 * Fields that are used in the internal representation of have-your-say
	 */
	export interface InternalFields {
		reference: string;
		statusId: string;
		submittedDate: string | Date;
		submittedReceivedMethodId: string;
		submissionMethodReason?: string;
		categoryId?: string;
		wantsToBeHeard?: boolean;
		containsAttachments: boolean;
		sharePointFolderCreated?: string;
		commentRedacted?: string;
		distressingContentInRepresentation?: YesNo;
		distressingContentInRepresentationShowManageAction?: boolean;

		readonly applicationReference?: string;
		readonly requiresReview?: boolean;
		readonly submittedByContactId?: string;
		readonly representedContactId?: string;
		readonly submittedByAddressId?: string;
	}

	/**
	 * Myself have-your-say fields
	 */
	export interface Myself {
		myselfFirstName?: string;
		myselfLastName?: string;
		myselfContactPreference?: string;
		myselfAddress?: Address;
		myselfEmail: string;
		myselfComment: string;
		myselfAttachments?: Attachment[];
		myselfBlobAttachments?: Attachment[];
		myselfRedactedAttachments?: Attachment[];
		myselfContainsAttachments?: YesNo;
		myselfWithholdName?: YesNo;
		/** any 'submitter' keys that are dynamically accessed */
		submitterAttachments?: never;
		submitterBlobAttachments?: never;
		submitterRedactedAttachments?: never;
		submitterContainsAttachments?: never;
		submitterWithholdName?: never;
	}

	/**
	 * On behalf of have-your-say fields
	 */
	export type OnBehalfOf = OnBehalfOfOptions & {
		representedTypeId: string;
		submitterFirstName?: string;
		submitterLastName?: string;
		submitterContactPreference?: string;
		submitterAddress?: Address;
		submitterEmail: string;
		submitterComment: string;
		submitterAttachments?: Attachment[];
		submitterRedactedAttachments?: Attachment[];
		submitterBlobAttachments?: Attachment[];
		submitterContainsAttachments?: YesNo;
		submitterWithholdName?: YesNo;
		/** any 'myself' keys that are dynamically accessed */
		myselfAttachments?: never;
		myselfRedactedAttachments?: never;
		myselfBlobAttachments?: never;
		myselfContainsAttachments?: never;
		myselfWithholdName?: never;
	};

	/**
	 * On behalf of have-your-say journey specific field options
	 */
	export type OnBehalfOfOptions = OnBehalfOfPerson | OnBehalfOfOrg | OnBehalfOfOrgNotWorkFor;

	/**
	 * On behalf of a person have-your-say fields
	 */
	export type OnBehalfOfPerson = IsAgent & {
		representedFirstName?: string;
		representedLastName?: string;
	};

	/**
	 * On behalf of an org have-your-say fields
	 */
	export interface OnBehalfOfOrg {
		orgName: string;
		orgRoleName: string;
	}

	/**
	 * On behalf of an org I don't work have-your-say fields
	 */
	export type OnBehalfOfOrgNotWorkFor = IsAgent & {
		representedOrgName: string;
	};

	export interface IsAgent {
		isAgent: boolean;
		agentOrgName?: string;
	}

	/**
	 * The shape used by attachments in view model
	 */
	export type Attachment = {
		itemId: string;
		fileName: string;
		statusId?: string;
	};
}
