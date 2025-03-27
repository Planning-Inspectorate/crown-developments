import { Address } from '@pins/dynamic-forms/src/lib/address.js';
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
		categoryId?: string;
		wantsToBeHeard?: boolean;
		containsAttachments: boolean;
		sharePointFolderCreated?: string;
		commentRedacted?: string;

		readonly applicationReference?: string;
		readonly requiresReview?: boolean;
		readonly submittedByContactId?: string;
		readonly representedContactId?: string;
	}

	/**
	 * Myself have-your-say fields
	 */
	export interface Myself {
		myselfIsAdult: boolean;
		myselfFullName?: string;
		myselfAddress?: Address;
		myselfContactPreference?: string;
		myselfEmail: string;
		myselfComment: string;
	}

	/**
	 * On behalf of have-your-say fields
	 */
	export type OnBehalfOf = OnBehalfOfOptions & {
		representedTypeId: string;
		submitterIsAdult: boolean;
		submitterFullName?: string;
		submitterEmail: string;
		submitterComment: string;
	};

	/**
	 * On behalf of have-your-say journey specific field options
	 */
	export type OnBehalfOfOptions = OnBehalfOfPerson | OnBehalfOfOrg | OnBehalfOfOrgNotWorkFor;

	/**
	 * On behalf of a person have-your-say fields
	 */
	export type OnBehalfOfPerson = IsAgent & {
		representedIsAdult: boolean;
		representedFullName?: string;
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
}
