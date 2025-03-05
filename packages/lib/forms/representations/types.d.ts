/**
 * The view model used for have-your-say answers
 */
export type HaveYourSayViewModel = HaveYourSay.Common & (HaveYourSay.Myself | HaveYourSay.OnBehalfOf);

export namespace HaveYourSay {
	/**
	 * Common have-your-say fields for all journeys
	 */
	export interface Common {
		submittedForId: string;
	}

	/**
	 * Myself have-your-say fields
	 */
	export interface Myself {
		myselfIsAdult: boolean;
		myselfFullName?: string;
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
		isRepresentedPersonAdult: boolean;
		representedPersonFullName?: string;
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
		orgNameRepresenting: string;
	};

	export interface IsAgent {
		isAgent: boolean;
		agentOrgName?: string;
	}
}
