import {
	addSessionData,
	clearSessionData,
	isUnsafeObjectKey,
	readSessionData
} from '@pins/crowndev-lib/util/session.ts';
import type { Request } from 'express';
import { getStringParams } from '@pins/crowndev-lib/util/params.ts';

export function validateParams(params: Record<string, string>) {
	const { id, updateId: applicationUpdateId } = getStringParams(params, ['id', 'updateId']);

	return { id, applicationUpdateId };
}

export function addAppUpdateStatus(req: Request, id: string, reviewDecision: string) {
	addSessionData(req, id, { applicationUpdateStatus: reviewDecision });
}

export function readAppUpdateStatus(req: Request, id: string) {
	return readSessionData(req, id, 'applicationUpdateStatus', false);
}

export function clearAppUpdateStatusSession(req: Request, id: string) {
	clearSessionData(req, id, 'applicationUpdateStatus');
}

export function getApplicationUpdateSessionData(req: Request, applicationUpdateId: string) {
	if (isUnsafeObjectKey(applicationUpdateId)) {
		throw new Error('Unsafe object key detected');
	}
	return req.session?.appUpdates?.[applicationUpdateId] || {};
}

/**
 * Clears application updates from the session
 */
export function clearAppUpdatesFromSession(req: Request, applicationUpdateId: string | undefined) {
	if (!req.session) {
		return;
	}

	if (applicationUpdateId === undefined) {
		req.session.appUpdates = {};
		return;
	}
	if (typeof applicationUpdateId === 'string' && isUnsafeObjectKey(applicationUpdateId)) {
		throw new Error('Unsafe object key detected');
	}
	const appUpdates = req.session.appUpdates || (req.session.appUpdates = {});
	delete appUpdates[applicationUpdateId];
}
