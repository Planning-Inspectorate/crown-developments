import type { Page } from '@playwright/test';

import { AddressUtility } from '../page-components/address.component.ts';
import { CheckAnswersComponent } from '../page-components/check-answers.component.ts';
import { CheckDetailsComponent } from '../page-components/check-details.component.ts';
import { CommonComponent } from '../page-components/common.component.ts';
import { ContactDetailsComponent } from '../page-components/contact-details.component.ts';
import { CoordinatesComponent } from '../page-components/coordinates.component.ts';
import { DateUtility } from '../page-components/date.component.ts';
import { ListboxComponent } from '../page-components/listbox.component.ts';
import { RadioGroupComponent } from '../page-components/radio-group.component.ts';

import { AgentOrganisationAddressPage } from './agent-organisation-address.page.ts';
import { AgentOrganisationNamePage } from './agent-organisation-name.page.ts';
import { ApplicantUsingAgentPage } from './applicant-using-agent.page.ts';
import { ApplicationClassificationPage } from './application-classification.page.ts';
import { ApplicationStagePage } from './application-stage.page.ts';
import { ApplicationTypePage } from './application-type.page.ts';
import { CasesPage } from './cases.page.ts';
import { LoginMicrosoftPage } from './microsoft-login.page.ts';
import { LPAContactDetailsPage } from './lpa-contact-detail.page.ts';
import { SecondaryLocalPlanningAuthorityPage } from './secondary-planning-authority.page.ts';
import { WhichPlanningAuthorityPage } from './which-planning-authority.page.ts';

export class PageManager {
	private readonly page: Page;

	public readonly address: AddressUtility;
	public readonly checkAnswers: CheckAnswersComponent;
	public readonly checkDetails: CheckDetailsComponent;
	public readonly common: CommonComponent;
	public readonly contactDetails: ContactDetailsComponent;
	public readonly coordinates: CoordinatesComponent;
	public readonly date: DateUtility;

	public readonly agentOrganisationAddress: AgentOrganisationAddressPage;
	public readonly agentOrganisationName: AgentOrganisationNamePage;
	public readonly applicantUsingAgent: ApplicantUsingAgentPage;
	public readonly applicationClassification: ApplicationClassificationPage;
	public readonly applicationStage: ApplicationStagePage;
	public readonly applicationType: ApplicationTypePage;
	public readonly cases: CasesPage;
	public readonly loginMicrosoft: LoginMicrosoftPage;
	public readonly lpaContactDetail: LPAContactDetailsPage;
	public readonly secondaryPlanningAuthority: SecondaryLocalPlanningAuthorityPage;
	public readonly whichPlanningAuthority: WhichPlanningAuthorityPage;

	constructor(page: Page) {
		this.page = page;

		this.address = new AddressUtility(page);
		this.checkAnswers = new CheckAnswersComponent(page);
		this.checkDetails = new CheckDetailsComponent(page);
		this.common = new CommonComponent(page);
		this.contactDetails = new ContactDetailsComponent(page);
		this.coordinates = new CoordinatesComponent(page);
		this.date = new DateUtility(page);

		this.agentOrganisationAddress = new AgentOrganisationAddressPage(page);
		this.agentOrganisationName = new AgentOrganisationNamePage(page);
		this.applicantUsingAgent = new ApplicantUsingAgentPage(page);
		this.applicationClassification = new ApplicationClassificationPage(page);
		this.applicationStage = new ApplicationStagePage(page);
		this.applicationType = new ApplicationTypePage(page);
		this.cases = new CasesPage(page);
		this.loginMicrosoft = new LoginMicrosoftPage(page);
		this.lpaContactDetail = new LPAContactDetailsPage(page);
		this.secondaryPlanningAuthority = new SecondaryLocalPlanningAuthorityPage(page);
		this.whichPlanningAuthority = new WhichPlanningAuthorityPage(page);
	}

	/**
	 * Creates a listbox component for a specific input id.
	 */
	public listbox(inputId: string): ListboxComponent {
		return new ListboxComponent(this.page, inputId);
	}

	/**
	 * Creates a radio group component for a specific radio name.
	 */
	public radioGroup(radioName: string): RadioGroupComponent {
		return new RadioGroupComponent(this.page, radioName);
	}
}
