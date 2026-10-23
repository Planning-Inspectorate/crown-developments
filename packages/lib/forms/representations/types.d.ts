import type { Address } from '@planning-inspectorate/dynamic-forms';
import type { YesNo } from '../../util/types.ts';
/**
 * The view model used for have-your-say answers
 */
export type HaveYourSayViewModel = HaveYourSay.Common & (HaveYourSay.Myself | HaveYourSay.OnBehalfOf);

/**
 * The view model used for have-your-say review & view in the manage app
 *
 * Includes an index signature so it's assignable to the `Record<string, unknown>`-based
 * locals/answers types used by the dynamic forms journey machinery (see `BaseLocals`).
 */
export type HaveYourSayManageModel = HaveYourSayViewModel & HaveYourSay.InternalFields;

export type HaveYourSayManageAnswers = HaveYourSayManageModel & Record<string, unknown>;

export type HaveYourSayManageModelFields = keyof HaveYourSayManageModel;

type RepresentationSaveFields<T> = {
	[K in keyof T]?: K extends
		| 'myselfContainsAttachments'
		| 'submitterContainsAttachments'
		| 'myselfWithholdName'
		| 'submitterWithholdName'
		| 'myselfHearingPreference'
		| 'submitterHearingPreference'
		| 'containsAttachments'
		| 'distressingContentInRepresentation'
		? boolean
		: T[K];
};

/**
 * Per-question save answers, rather than a complete representation view model.
 * Upload fields contain draft attachment references and folder creation is saved as a boolean.
 */
export type HaveYourSaySaveModel = RepresentationSaveFields<
	HaveYourSay.Common &
		Omit<HaveYourSay.InternalFields, 'sharePointFolderCreated'> &
		(HaveYourSay.Myself | HaveYourSay.OnBehalfOf)
> & {
	sharePointFolderCreated?: boolean;
	withdrawalRequests?: HaveYourSay.Attachment[];
	ajaxWithdrawalRequests?: HaveYourSay.Attachment[];
	manageGroupDetails?: HaveYourSay.GroupMember[];
};

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
		submittedDate: Date;
		submittedReceivedMethodId: string;
		submissionMethodReason?: string;
		categoryId?: string;
		wantsToBeHeard?: boolean;
		containsAttachments: YesNo;
		sharePointFolderCreated?: YesNo;
		commentRedacted?: string;
		distressingContentInRepresentation?: YesNo;
		distressingContentInRepresentationShowManageAction?: YesNo;
		withdrawalRequestDate?: Date;
		withdrawalReasonId?: string;
		dateWithdrawn?: Date;

		readonly applicationReference: string;
		readonly requiresReview: boolean;
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
		myselfHearingPreference?: YesNo;
		/** any 'submitter' keys that are dynamically accessed */
		submitterAttachments?: never;
		submitterBlobAttachments?: never;
		submitterRedactedAttachments?: never;
		submitterContainsAttachments?: never;
		submitterWithholdName?: never;
		submitterHearingPreference?: never;
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
		submitterHearingPreference?: YesNo;
		/** any 'myself' keys that are dynamically accessed */
		myselfAttachments?: never;
		myselfRedactedAttachments?: never;
		myselfBlobAttachments?: never;
		myselfContainsAttachments?: never;
		myselfWithholdName?: never;
		myselfHearingPreference?: never;
	};

	/**
	 * On behalf of have-your-say journey specific field options
	 */
	export type OnBehalfOfOptions = OnBehalfOfPerson | OnBehalfOfOrg | OnBehalfOfOrgNotWorkFor | OnBehalfOfGroup;

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

	/**
	 * On behalf of a group of people have-your-say fields (S62A only)
	 */
	export type OnBehalfOfGroup = IsAgent & {
		groupName?: string;
		manageGroupDetails?: GroupMember[];
	};

	export interface IsAgent {
		isAgent: boolean;
		agentOrgName?: string;
	}

	/**
	 * A single person's details within a group representation's `manageGroupDetails` list
	 */
	export type GroupMember = {
		id?: string;
		groupRepresentedFirstName?: string;
		groupRepresentedLastName?: string;
	};

	/**
	 * The shape used by attachments in view model
	 */
	export type Attachment = {
		itemId: string;
		fileName: string;
		statusId?: string;
	};

	export type RedactedAttachment = {
		redactedItemId?: string | null;
		redactedBlobName?: string | null;
		redactedFileName?: string | null;
	};
}
