import { addSessionData, clearSessionData, readSessionData } from '@pins/crowndev-lib/util/session.js';

export function validateParams(params) {
	const id = params.id;
	if (!id) {
		throw new Error('id param required');
	}

	const applicationUpdateId = params.updateId;
	if (!applicationUpdateId) {
		throw new Error('application update id param required');
	}

	return { id, applicationUpdateId };
}

export function addAppUpdateStatus(req, id, reviewDecision) {
	addSessionData(req, id, { applicationUpdateStatus: reviewDecision });
}

export function readAppUpdateStatus(req, id) {
	return readSessionData(req, id, 'applicationUpdateStatus', false);
}

export function clearAppUpdateStatusSession(req, id) {
	clearSessionData(req, id, 'applicationUpdateStatus');
}

export function getApplicationUpdateSessionData(req, applicationUpdateId) {
	return req.session?.appUpdates?.[applicationUpdateId] || {};
}

/**
 * Clears application updates from the session
 * @param {import('express').Request} req
 * @param {string} [applicationUpdateId]
 */
export function clearAppUpdatesFromSession(req, applicationUpdateId) {
	if (!req.session) {
		return;
	}

	if (applicationUpdateId === undefined) {
		req.session.appUpdates = {};
		return;
	}

	/** @type {Record<string, any>} */
	const appUpdates = req.session.appUpdates || (req.session.appUpdates = {});
	delete appUpdates[applicationUpdateId];
}
