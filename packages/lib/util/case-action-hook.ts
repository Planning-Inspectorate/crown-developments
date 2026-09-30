import type { Request } from 'express';
import type { Logger } from 'pino';

/**
 * An optional step to run after a case action (e.g. publish) has succeeded,
 * such as recording it in the case history. Shared handlers take one of
 * these so each data model can add its own behaviour without the handler
 * needing to know about it.
 */
export type CaseActionHook = (req: Request, caseId: string) => Promise<void>;

/**
 * Runs a hook if there is one. The action has already succeeded, so a
 * failing hook is logged rather than allowed to affect the user.
 */
export async function runCaseActionHook(
	hook: CaseActionHook | undefined,
	req: Request,
	caseId: string,
	logger: Logger,
	actionName: string
): Promise<void> {
	if (!hook) return;

	try {
		await hook(req, caseId);
	} catch (error) {
		logger.error({ err: error, id: caseId }, `Failed to run the after-${actionName} step`);
	}
}
