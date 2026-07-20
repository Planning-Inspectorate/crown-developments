import { type ApplicationCreateCaseJourney } from '../types/create-case-journey.type.ts';

export const applicationCreateCaseJourneys = [
	{
		name: 'Application > Major > Planning permission > No secondary LPA > No agent',
		variant: 'application',
		applicationClassification: 'major',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Application > Non-major > Planning permission > No secondary LPA > Agent',
		variant: 'application',
		applicationClassification: 'nonMajor',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'yes',
		tags: ['regression']
	},
	{
		name: 'Application > Major > Planning permission > Secondary LPA > No agent',
		variant: 'application',
		applicationClassification: 'major',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'yes',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Application > Non-major > Planning permission > Secondary LPA > Agent',
		variant: 'application',
		applicationClassification: 'nonMajor',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'yes',
		hasAgent: 'yes',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Application > Major > Outline planning permission with some matters reserved',
		variant: 'application',
		applicationClassification: 'major',
		applicationType: 'outlinePlanningPermissionSomeReserved',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Application > Non-major > Outline planning permission with all matters reserved',
		variant: 'application',
		applicationClassification: 'nonMajor',
		applicationType: 'outlinePlanningPermissionAllReserved',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Application > Major > Approval of reserved matters following outline approval',
		variant: 'application',
		applicationClassification: 'major',
		applicationType: 'approvalOfReservedMatters',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Application > Non-major > Planning permission and listed building consent',
		variant: 'application',
		applicationClassification: 'nonMajor',
		applicationType: 'planningPermissionAndListedBuildingConsent',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	}
] as const satisfies readonly ApplicationCreateCaseJourney[];
