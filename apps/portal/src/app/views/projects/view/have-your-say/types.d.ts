import { Address } from '@pins/dynamic-forms/src/lib/address';

export interface HaveYourSayAnswers {
	submittingFor: string;
	fullName?: string;
	fullNameAgent?: string;
	fullNameOrg?: string;
	isAdult: boolean;
	email?: string;
	address?: Address;
	telephoneNumber?: string;
	comment: string;
}
