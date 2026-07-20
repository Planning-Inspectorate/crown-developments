import { type ContactDetails } from '../page-components/contact-details.component.ts';
import { type UkAddress } from '../page-components/address.component.ts';
import { type ApplicantUsingAgentOption } from '../page-objects/applicant-using-agent.page.ts';
import { type ApplicationClassificationOption } from '../page-objects/application-classification.page.ts';
import { type ApplicationTypeOption } from '../page-objects/application-type.page.ts';
import { type SecondaryLocalPlanningAuthorityOption } from '../page-objects/secondary-planning-authority.page.ts';
import { type ApplicationVariant } from './page-options.type.ts';

export type TestTag = 'smoke' | 'regression';

type CreateCaseJourneyBase = {
	name: string;
	variant: ApplicationVariant;
	applicationType: ApplicationTypeOption;
	lpaContactDetails?: Partial<ContactDetails>;
	hasSecondaryLocalPlanningAuthority: SecondaryLocalPlanningAuthorityOption;
	secondaryLpaContactDetails?: Partial<ContactDetails>;
	hasAgent: ApplicantUsingAgentOption;
	agentOrganisationName?: string;
	agentOrganisationAddress?: Partial<UkAddress>;
	tags: readonly TestTag[];
};

export type PreApplicationCreateCaseJourney = CreateCaseJourneyBase & {
	variant: 'preApplication';
	applicationClassification?: never;
};

export type ApplicationCreateCaseJourney = CreateCaseJourneyBase & {
	variant: 'application';
	applicationClassification: ApplicationClassificationOption;
};

export type CreateCaseJourney = PreApplicationCreateCaseJourney | ApplicationCreateCaseJourney;
