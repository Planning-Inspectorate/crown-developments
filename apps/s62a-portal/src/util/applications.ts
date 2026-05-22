import { addYears, isAfter, isValid } from 'date-fns';
import type { Prisma, PrismaClient } from '@pins/crowndev-database/src/client/client.ts';

/**
 * Application status for clarity and readability
 */
export const APPLICATION_PUBLISH_STATUS = {
	ACTIVE: 'active',
	WITHDRAWN: 'withdrawn',
	EXPIRED: 'expired'
} as const;

export type ApplicationPublishStatus = (typeof APPLICATION_PUBLISH_STATUS)[keyof typeof APPLICATION_PUBLISH_STATUS];

/**
 * Is the application expired?
 */
export function isExpired(status: ApplicationPublishStatus | undefined) {
	return status === APPLICATION_PUBLISH_STATUS.EXPIRED;
}

/**
 * Is the application withdrawn or expired?
 */
export function isWithdrawnOrExpired(status: ApplicationPublishStatus | undefined) {
	return status === APPLICATION_PUBLISH_STATUS.WITHDRAWN || status === APPLICATION_PUBLISH_STATUS.EXPIRED;
}

/**
 * Determine application status based on withdrawnDate and expiry
 */
export function getApplicationStatus(withdrawnDate: Date | null | undefined): ApplicationPublishStatus {
	const now = new Date();
	if (!withdrawnDate || !isValid(withdrawnDate)) {
		return APPLICATION_PUBLISH_STATUS.ACTIVE;
	}
	if (isAfter(withdrawnDate, now)) {
		return APPLICATION_PUBLISH_STATUS.ACTIVE;
	}
	const expired = isAfter(now, addYears(withdrawnDate, 1));
	return expired ? APPLICATION_PUBLISH_STATUS.EXPIRED : APPLICATION_PUBLISH_STATUS.WITHDRAWN;
}

/**
 * Fetch a published application by ID, ensuring it has a publishDate in the past and including withdrawnDate for status checks.
 */
export async function fetchPublishedApplication({
	db,
	id,
	args = {}
}: {
	db: PrismaClient;
	id: string;
	args?: Partial<Prisma.CrownDevelopmentFindUniqueArgs>;
}) {
	const normalisedArgs: Prisma.CrownDevelopmentFindUniqueArgs = {
		...args,
		where: args.where ?? { id }
	};
	normalisedArgs.where.id = id;
	const now = new Date();
	normalisedArgs.where.publishDate = { lte: now };

	if (normalisedArgs.select) {
		normalisedArgs.select = { ...normalisedArgs.select, withdrawnDate: true };
	}
	return db.crownDevelopment.findUnique(normalisedArgs);
}
