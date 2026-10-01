import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';
import { type ApplicationPublishStatus, getApplicationStatus } from '@pins/crowndev-lib/util/applications.ts';

export type S62aCaseWithRelations = Prisma.S62aCaseGetPayload<{
	include: {
		S62aDates: true;
	};
}>;

export type S62aCaseView = {
	id: string;
	reference: string;
	applicationStatus?: ApplicationPublishStatus;
};

export function s62aCaseToViewModel(s62aCase: S62aCaseWithRelations): S62aCaseView {
	const fields = {
		id: s62aCase.id,
		reference: s62aCase.reference
	} as S62aCaseView;

	if (s62aCase.S62aDates && 'withdrawnDate' in s62aCase.S62aDates) {
		fields.applicationStatus = getApplicationStatus(s62aCase.S62aDates.withdrawnDate);
	}

	return fields;
}
