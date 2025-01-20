import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController, newReference, toCreateInput, uniqueReference } from './save.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { SUBMITTING_FOR_OPTIONS } from './questions.js';
import { REPRESENTATION_TYPE_ID } from '@pins/crowndev-database/src/seed/data-static.js';

describe('save', () => {
	describe('buildSaveController', () => {
		const dbMock = () => {
			return {
				representation: {
					create: mock.fn(() => ({ id: 'id-1' })),
					count: mock.fn(() => 0)
				},
				$transaction(fn) {
					return fn(this);
				}
			};
		};

		it('should throw if no journey response or answers', () => {
			const db = dbMock();
			const save = buildSaveController({ db, logger: mockLogger() });

			// no locals
			assert.rejects(() => save({}, {}));
			// no answers
			assert.rejects(() =>
				save(
					{},
					{
						locals: {
							journeyResponse: {}
						}
					},
					mock.fn()
				)
			);
		});

		it('should call create with a valid payload', async () => {
			const db = dbMock();
			const save = buildSaveController({ db, logger: mockLogger() });
			const answers = {
				submittingFor: SUBMITTING_FOR_OPTIONS.MYSELF,
				fullName: 'Person One',
				comment: 'Something about the project.'
			};
			const req = {
				params: { projectId: 'project-1' }
			};
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save(req, res, mock.fn());

			assert.strictEqual(db.representation.create.mock.callCount(), 1);

			const { data } = db.representation.create.mock.calls[0].arguments[0];
			const required = ['status', 'receivedDate', 'originalComment'];
			for (const field of required) {
				assert.ok(data[field], `${field} is required`);
			}
			const connects = ['Project', 'RepresentedType'];
			for (const connect of connects) {
				assert.ok(data[connect]?.connect?.id, `${connect} is required`);
			}

			assert.strictEqual(res.redirect.mock.callCount(), 1);

			// todo: integration test to run Prisma's validation?
		});
	});

	describe('toCreateInput', () => {
		it('should return a valid create input', () => {
			/**
			 * @type {import('./types.d.ts').HaveYourSayAnswers}
			 */
			const answers = {
				submittingFor: SUBMITTING_FOR_OPTIONS.MYSELF,
				fullName: 'Person One',
				comment: 'Something about the project.'
			};
			const input = toCreateInput(answers, 'ref-1', 'project-1');
			assert.ok(input);
			assert.strictEqual(input.Project.connect.id, 'project-1');
			assert.strictEqual(input.RepresentedType.connect.id, REPRESENTATION_TYPE_ID.PERSON);
			assert.strictEqual(input.originalComment, answers.comment);
			assert.strictEqual(input.Contact.create.fullName, answers.fullName);
			assert.strictEqual(input.Contact.create.Address, undefined);
		});
		it('should use agent name', () => {
			/**
			 * @type {import('./types.d.ts').HaveYourSayAnswers}
			 */
			const answers = {
				submittingFor: SUBMITTING_FOR_OPTIONS.AGENT,
				fullNameAgent: 'Agent One',
				comment: 'Something about the project.'
			};
			const input = toCreateInput(answers, 'ref-1', 'project-1');
			assert.ok(input);
			assert.strictEqual(input.Contact.create.fullName, answers.fullNameAgent);
		});
		it('should use org name', () => {
			/**
			 * @type {import('./types.d.ts').HaveYourSayAnswers}
			 */
			const answers = {
				submittingFor: SUBMITTING_FOR_OPTIONS.ORGANISATION,
				fullNameOrg: 'Org One',
				comment: 'Something about the project.'
			};
			const input = toCreateInput(answers, 'ref-1', 'project-1');
			assert.ok(input);
			assert.strictEqual(input.Contact.create.fullName, answers.fullNameOrg);
		});
		it('should include address if set', () => {
			/**
			 * @type {import('./types.d.ts').HaveYourSayAnswers}
			 */
			const answers = {
				submittingFor: SUBMITTING_FOR_OPTIONS.ORGANISATION,
				fullNameOrg: 'Org One',
				comment: 'Something about the project.',
				address: { addressLine1: 'My House' }
			};
			const input = toCreateInput(answers, 'ref-1', 'project-1');
			assert.ok(input);
			assert.strictEqual(input.Contact.create.Address.create.line1, answers.address.addressLine1);
		});
	});

	describe('uniqueReference', () => {
		const dbMock = () => {
			return {
				representation: {
					count: mock.fn(() => 0)
				}
			};
		};
		it('should use the first reference if no existing entries match', async () => {
			const db = dbMock();
			const gen = mock.fn(() => 'abc123');
			const ref = await uniqueReference(db, gen);
			assert.strictEqual(ref, 'abc123');
		});
		it('should retry if first reference is in use', async () => {
			const db = dbMock();
			let counter = 0;
			let refs = ['abc123', 'abc124', 'abc125'];
			let counts = [1, 1, 0];
			const gen = mock.fn(() => refs[counter]);
			db.representation.count.mock.mockImplementation(() => counts[counter++]);
			const ref = await uniqueReference(db, gen);
			assert.strictEqual(ref, 'abc125');
		});
		it('should throw after 10 tries', async () => {
			const db = dbMock();
			const gen = mock.fn(() => 'abc123');
			db.representation.count.mock.mockImplementation(() => 1);
			await assert.rejects(() => uniqueReference(db, gen));
			assert.strictEqual(gen.mock.callCount(), 10);
		});
	});

	describe('newReference', () => {
		it('should generate references with 4 x 4 chars', () => {
			const ref = newReference();
			assert.ok(ref);
			assert.strictEqual(ref.length, 19);
			assert.match(ref, /([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})/);
		});
	});
});
