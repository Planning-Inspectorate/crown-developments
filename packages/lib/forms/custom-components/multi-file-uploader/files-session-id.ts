import { getOptionalStringParam, getStringParam } from '../../../util/params.ts';

/**
 * The id that uploaded files are kept under in the session (`session.files[id][question]`):
 * the case `id` in the back office, or the `applicationId` in the S62A portal.
 */
export function getFilesSessionId(params: Record<string, unknown> | undefined): string {
	return getOptionalStringParam(params, 'id') ?? getStringParam(params, 'applicationId');
}
