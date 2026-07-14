import type { Request, Response } from 'express';
import type { SaveDataFn } from '@planning-inspectorate/dynamic-forms';
import type { ManageService } from '#service';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { wrapPrismaError } from '@pins/crowndev-lib/util/database.ts';
import { S62aCaseUpdateMapper, type UpdateCaseAnswers } from './s62a-update-case-mapper.ts';
import { addSessionData } from '@pins/crowndev-lib/util/session.ts';

/**
 * Save handler for S62A Case updates.
 * Takes the raw form answers, maps them to Prisma format, and updates the database.
 */
export function buildS62aUpdateCase(service: ManageService, clearAnswer = false): SaveDataFn {
	return async ({ req, data }: { req: Request; res: Response; data: { answers?: UpdateCaseAnswers } }) => {
		const { db, logger } = service;
		const id = getStringParam(req.params, 'id');

		logger.info({ id }, 'S62A case update initiated');

		const answers = data?.answers || {};

		if (Object.keys(answers).length === 0) {
			logger.info({ id }, 'No case updates to apply');
			return;
		}

		// Wipes answers that were indentified as being removed
		if (clearAnswer) {
			Object.keys(answers).forEach((key) => {
				Object.assign(answers, { [key]: null });
			});
		}

		try {
			const mapper = new S62aCaseUpdateMapper(answers);
			const updateInput = mapper.generateUpdateInput();

			if (Object.keys(updateInput).length === 0) {
				logger.info({ id }, 'No valid database fields mapped for update');
				return;
			}

			await db.s62aCase.update({
				where: { id },
				data: {
					...updateInput,
					updatedDate: new Date()
				}
			});

			addSessionData(req, id, { updated: true });

			logger.info({ id }, 'S62A case updated successfully');
		} catch (error) {
			wrapPrismaError({
				error,
				logger,
				message: 'updating S62A case',
				logParams: { id }
			});
		}
	};
}
