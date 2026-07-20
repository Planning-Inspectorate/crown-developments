import { type PreApplicationCreateCaseJourney } from '../types/create-case-journey.type.ts';

export const preApplicationCreateCaseJourneys = [
	{
		name: 'Pre-application > Planning permission > No secondary LPA > No agent',
		variant: 'preApplication',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Pre-application > Planning permission > No secondary LPA > Agent',
		variant: 'preApplication',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'yes',
		tags: ['regression']
	},
	{
		name: 'Pre-application > Planning permission > Secondary LPA > No agent',
		variant: 'preApplication',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'yes',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Pre-application > Planning permission > Secondary LPA > Agent',
		variant: 'preApplication',
		applicationType: 'planningPermission',
		hasSecondaryLocalPlanningAuthority: 'yes',
		hasAgent: 'yes',
		tags: ['smoke', 'regression']
	},
	{
		name: 'Pre-application > Outline planning permission with some matters reserved',
		variant: 'preApplication',
		applicationType: 'outlinePlanningPermissionSomeReserved',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Pre-application > Outline planning permission with all matters reserved',
		variant: 'preApplication',
		applicationType: 'outlinePlanningPermissionAllReserved',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Pre-application > Approval of reserved matters following outline approval',
		variant: 'preApplication',
		applicationType: 'approvalOfReservedMatters',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	},
	{
		name: 'Pre-application > Planning permission and listed building consent',
		variant: 'preApplication',
		applicationType: 'planningPermissionAndListedBuildingConsent',
		hasSecondaryLocalPlanningAuthority: 'no',
		hasAgent: 'no',
		tags: ['regression']
	}
] as const satisfies readonly PreApplicationCreateCaseJourney[];
