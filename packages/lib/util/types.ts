import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { AuditService } from '../audit/index.js';
import type { InitEntraClient } from '../graph/types.js';
import type { Logger } from 'pino';
import type { AsyncRequestHandler } from '@pins/crowndev-lib/util/async-handler.ts';
import type { Handler } from 'express';

export type YesNo = 'yes' | 'no';

export type ErrorSummaryItem = {
	text: string;
	href: string;
};

export const CASE_DATA_MODEL = {
	CROWN: 'crown',
	S62A: 's62a'
} as const;

export type CaseDataModel = (typeof CASE_DATA_MODEL)[keyof typeof CASE_DATA_MODEL];

export type CaseHistoryViewPayload = {
	reference: string;
	updatedDate?: Date | null;
	updatedById?: string | null;
};

export type CommonCaseDelegate = {
	findUnique(args: {
		where: { id: string };
		select?: { reference?: boolean; updatedDate?: boolean; updatedById?: boolean };
	}): Promise<CaseHistoryViewPayload | null>;

	update(args: { where: { id: string }; data: { updatedDate: Date; updatedById?: string } }): Promise<unknown>;
};

export type CaseModelConfig = {
	fk: 'crownDevelopmentId' | 's62aId';
	relation: string;
	delegate: (db: PrismaClient) => CommonCaseDelegate;
};

export const CASE_MODELS: Record<CaseDataModel, CaseModelConfig> = {
	[CASE_DATA_MODEL.CROWN]: {
		fk: 'crownDevelopmentId',
		relation: 'CrownDevelopment',
		delegate: (db: PrismaClient): CommonCaseDelegate => db.crownDevelopment
	},
	[CASE_DATA_MODEL.S62A]: {
		fk: 's62aId',
		relation: 'S62aCase',
		delegate: (db: PrismaClient): CommonCaseDelegate => db.s62aCase
	}
};

export type AnswerValidationError = {
	value: unknown;
	errorMessage: string;
	pageLink: string;
};

export interface CaseService {
	db: PrismaClient;
	logger: Logger;
	audit: AuditService;
	getEntraClient: InitEntraClient;
	entraGroupIds: {
		caseOfficers: string;
		inspectors: string;
	};
}

export type JourneyMiddlewareType = (service: CaseService, isQuestionView: boolean) => Handler | AsyncRequestHandler;

export type CaseFetcher<T> = (db: PrismaClient, id: string) => Promise<T | null>;
export type UnpublishCaseFetcher<T = unknown> = (db: PrismaClient, id: string) => Promise<T | null>;
export type PublishOperation<T = unknown> = (db: PrismaClient, id: string) => Promise<T>;
export type ValidationRuleBuilder<T> = (fetchedCase: NonNullable<T>, id: string) => AnswerValidationError[];
