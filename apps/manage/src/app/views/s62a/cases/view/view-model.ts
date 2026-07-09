import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export type S62aCaseDbModel = Prisma.S62aCaseGetPayload<{
	include: {
		S62aStatus: true;
	};
}>;

export interface S62aCaseViewModel {
	id: string;
	reference: string;
	developmentDescription: string;
	s62aStatusId?: string;
}

/**
 * Pure function to map a database record back to the frontend View Model.
 */
export function s62aCaseToViewModel(dbCase: S62aCaseDbModel): S62aCaseViewModel {
	return {
		id: dbCase.id,
		reference: dbCase.reference,
		developmentDescription: dbCase.description,
		s62aStatusId: dbCase.S62aStatus?.id
	};
}
