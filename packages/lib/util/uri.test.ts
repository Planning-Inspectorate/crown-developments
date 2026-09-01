import assert from 'node:assert';
import { describe, it } from 'node:test';
import { isValidRedirectUri } from './uri.ts';

describe('redirect', () => {
	describe('isValidRedirectUri', () => {
		const tests = [
			// Invalid types
			{ uri: true, valid: false },
			{ uri: 123, valid: false },
			{ uri: {}, valid: false },
			{ uri: null, valid: false },
			{ uri: undefined, valid: false },
			{ uri: ['/path'], valid: false },

			// Invalid formats and schemas
			{ uri: '', valid: false },
			{ uri: 'dashboard', valid: false },
			{ uri: 'users/profile', valid: false },
			{ uri: 'https://example.com/', valid: false },
			{ uri: 'javascript:alert(1)', valid: false },

			// Invalid (Security: Protocol-relative & Evasion)
			{ uri: '//example.com', valid: false },
			{ uri: '\\\\example.com', valid: false },
			{ uri: '/\\example.com', valid: false },
			{ uri: '/dashboard\\admin', valid: false },

			// Invalid (Security: Path Traversal)
			{ uri: '/..', valid: false },
			{ uri: '/../etc/passwd', valid: false },
			{ uri: '/dashboard/../../admin', valid: false },
			{ uri: '/dashboard/..', valid: false },
			{ uri: '/./', valid: false },
			{ uri: '/dashboard/./admin', valid: false },

			// Valid URIs
			{ uri: '/', valid: true },
			{ uri: '/dashboard', valid: true },
			{ uri: '/users/settings/profile', valid: true },
			{ uri: '/path-with-dashes', valid: true },
			{ uri: '/path?query=123&sort=asc', valid: true },
			{ uri: '/path#section-1', valid: true },

			// Valid (Safe dots)
			{ uri: '/.well-known/jwks.json', valid: true },
			{ uri: '/public/.env', valid: true },
			{ uri: '/file-with.dot', valid: true }
		];

		for (const test of tests) {
			it(`should return ${test.valid} for '${String(test.uri)}'`, () => {
				assert.strictEqual(isValidRedirectUri(test.uri), test.valid);
			});
		}
	});
});
