import assert from 'node:assert';
import { describe, it } from 'node:test';
import { getFilesSessionId } from './files-session-id.ts';

describe('getFilesSessionId', () => {
	it('should use the case id in the back office', () => {
		assert.strictEqual(getFilesSessionId({ id: 'case-1', question: 'attachments' }), 'case-1');
	});
	it('should use the application id in the S62A portal', () => {
		assert.strictEqual(getFilesSessionId({ applicationId: 'application-1', question: 'attachments' }), 'application-1');
	});
	it('should throw when there is neither', () => {
		assert.throws(() => getFilesSessionId({ question: 'attachments' }), /applicationId must be a single string value/);
	});
});
