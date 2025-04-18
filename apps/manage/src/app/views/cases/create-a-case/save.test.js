import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController, newReference } from './save.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('save', () => {
	//I need to mock copyDriveItem which is a method of getSharepointDrive
	describe('buildSaveController', () => {
		const dbMock = () => {
			return {
				crownDevelopment: {
					create: mock.fn(() => ({ id: 'id-1' })),
					findMany: mock.fn(() => [])
				},
				$transaction(fn) {
					return fn(this);
				}
			};
		};

		const mockService = () => {
			return {
				sharePointCaseTemplateId: '789',
				db: dbMock(),
				logger: mockLogger(),
				getSharePointDrive: () => null,
				notifyClient: null
			};
		};

		it('should throw if no journey response or answers', () => {
			const save = buildSaveController(mockService());

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
					}
				)
			);
		});

		it('should call create with a valid payload and skip sharepoint when sharepoint is disabled', async () => {
			const service = mockService();
			const db = service.db;

			const save = buildSaveController(service);
			const answers = {
				applicationDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1'
			};
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res, mock.fn());

			assert.strictEqual(db.crownDevelopment.create.mock.callCount(), 1);

			const { data } = db.crownDevelopment.create.mock.calls[0].arguments[0];
			const required = ['reference', 'description'];
			for (const field of required) {
				assert.ok(data[field], `${field} is required`);
			}
			const connects = ['Type', 'Lpa'];
			for (const connect of connects) {
				assert.ok(data[connect]?.connect?.id, `${connect} is required`);
			}

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(service.logger.warn.mock.callCount(), 2);
			// todo: integration test to run Prisma's validation?
		});

		it('should call create with a valid payload', async () => {
			const service = mockService();
			const { db } = service;
			const save = buildSaveController(service);
			const answers = {
				applicationDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1'
			};
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res, mock.fn());

			assert.strictEqual(service.db.crownDevelopment.create.mock.callCount(), 1);

			const { data } = db.crownDevelopment.create.mock.calls[0].arguments[0];
			const required = ['reference', 'description'];
			for (const field of required) {
				assert.ok(data[field], `${field} is required`);
			}
			const connects = ['Type', 'Lpa'];
			for (const connect of connects) {
				assert.ok(data[connect]?.connect?.id, `${connect} is required`);
			}

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			// todo: integration test to run Prisma's validation?
		});

		it('should call copyDriveItem and grant write access to the applicant when sharepoint is enabled and no agent email is provided', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => {
					return [
						{ id: 'id1', name: 'Applicant' },
						{ id: 'id2', name: 'LPA' }
					];
				}),
				getDriveItemByPath: mock.fn(() => {
					return {
						item: {
							webUrl: 'www.test-sharepoint.com/folder'
						}
					};
				}),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => {
					return {
						link: {
							webUrl: 'https://sharepoint.com/:f:/s/site/random_id'
						}
					};
				})
			};
			const service = mockService();
			service.getSharePointDrive = () => sharepointDrive;
			const save = buildSaveController(service);

			const answers = {
				applicationDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1',
				applicantEmail: 'applicantEmail'
			};
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res, mock.fn());

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.copyDriveItem.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.getItemsByPath.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.addItemPermissions.mock.callCount(), 1);
			assert.deepStrictEqual(sharepointDrive.addItemPermissions.mock.calls[0].arguments[1], {
				role: 'write',
				users: [{ email: answers.applicantEmail, id: '' }]
			});
		});
		it('should call copyDriveItem and grant write access to the applicant and agent when sharepoint is enabled and an agentEmail was provided', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => {
					return [
						{ id: 'id1', name: 'Applicant' },
						{ id: 'id2', name: 'LPA' }
					];
				}),
				getDriveItemByPath: mock.fn(() => {
					return {
						item: {
							webUrl: 'www.test-sharepoint.com/folder'
						}
					};
				}),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => {
					return {
						link: {
							webUrl: 'https://sharepoint.com/:f:/s/site/random_id'
						}
					};
				})
			};
			const service = mockService();
			service.getSharePointDrive = () => sharepointDrive;
			const save = buildSaveController(service);

			const answers = {
				applicationDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1',
				applicantEmail: 'applicantEmail',
				agentEmail: 'agentEmail'
			};
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res, mock.fn());

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.copyDriveItem.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.getItemsByPath.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.addItemPermissions.mock.callCount(), 1);
			assert.deepStrictEqual(sharepointDrive.addItemPermissions.mock.calls[0].arguments[1], {
				role: 'write',
				users: [
					{ email: answers.applicantEmail, id: '' },
					{ email: answers.agentEmail, id: '' }
				]
			});
		});
		it('should send email to the applicant when there is no agent on the case', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => {
					return [
						{ id: 'id1', name: 'Applicant' },
						{ id: 'id2', name: 'LPA' }
					];
				}),
				getDriveItemByPath: mock.fn(() => {
					return {
						webUrl: 'www.test-sharepoint.com/folder'
					};
				}),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => {
					return {
						link: {
							webUrl: 'https://sharepoint.com/:f:/s/site/random_id'
						}
					};
				})
			};
			const notifyClient = {
				sendAcknowledgePreNotification: mock.fn()
			};
			const service = mockService();
			service.getSharePointDrive = () => sharepointDrive;
			service.notifyClient = notifyClient;
			const save = buildSaveController(service);

			const req = {
				session: {
					forms: {
						'create-a-case': {
							hasAgent: false,
							applicantEmail: 'applicantEmail@mail.com',
							agentEmail: 'agentEmail@mail.com'
						}
					}
				}
			};
			const answers = {
				applicationDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1',
				hasAgent: false,
				applicantEmail: 'applicantEmail@mail.com',
				agentEmail: 'agentEmail@mail.com'
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

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(notifyClient.sendAcknowledgePreNotification.mock.callCount(), 1);
			assert.deepStrictEqual(notifyClient.sendAcknowledgePreNotification.mock.calls[0].arguments, [
				'applicantEmail@mail.com',
				{
					reference: 'CROWN/2025/0000001',
					sharePointLink: 'https://sharepoint.com/:f:/s/site/random_id'
				}
			]);
		});
		it('should send email to the agent when there is an agent on the case', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => {
					return [
						{ id: 'id1', name: 'Applicant' },
						{ id: 'id2', name: 'LPA' }
					];
				}),
				getDriveItemByPath: mock.fn(() => {
					return {
						webUrl: 'www.test-sharepoint.com/folder'
					};
				}),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => {
					return {
						link: {
							webUrl: 'https://sharepoint.com/:f:/s/site/random_id'
						}
					};
				})
			};
			const notifyClient = {
				sendAcknowledgePreNotification: mock.fn()
			};
			const service = mockService();
			service.getSharePointDrive = () => sharepointDrive;
			service.notifyClient = notifyClient;
			const save = buildSaveController(service);

			const req = {
				session: {
					forms: {
						'create-a-case': {
							hasAgent: true,
							applicantEmail: 'applicantEmail@mail.com',
							agentEmail: 'agentEmail@mail.com'
						}
					}
				}
			};
			const answers = {
				applicationDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1',
				hasAgent: true,
				applicantEmail: 'applicantEmail@mail.com',
				agentEmail: 'agentEmail@mail.com'
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

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(notifyClient.sendAcknowledgePreNotification.mock.callCount(), 1);
			assert.deepStrictEqual(notifyClient.sendAcknowledgePreNotification.mock.calls[0].arguments, [
				'agentEmail@mail.com',
				{
					reference: 'CROWN/2025/0000001',
					sharePointLink: 'https://sharepoint.com/:f:/s/site/random_id'
				}
			]);
		});
	});

	describe('newReference', () => {
		const dbMock = () => {
			return {
				crownDevelopment: {
					findMany: mock.fn(() => [])
				}
			};
		};
		it('should start from 1 if no cases', async () => {
			const db = dbMock();
			const ref = await newReference(db, new Date('2024-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2024/0000001');
		});
		it('should ignore bad references', async () => {
			const db = dbMock();
			db.crownDevelopment.findMany.mock.mockImplementationOnce(() => [{ reference: 'bad-ref/here' }]);
			const ref = await newReference(db, new Date('2024-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2024/0000001');
		});
		it('should increment final part of reference', async () => {
			const db = dbMock();
			db.crownDevelopment.findMany.mock.mockImplementationOnce(() => [{ reference: 'CROWN/2024/0123456' }]);
			const ref = await newReference(db, new Date('2024-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2024/0123457');
		});
		it('should ignore date from latest case', async () => {
			const db = dbMock();
			db.crownDevelopment.findMany.mock.mockImplementationOnce(() => [{ reference: 'CROWN/2022/0123456' }]);
			const ref = await newReference(db, new Date('2026-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2026/0123457');
		});
		it('should ignore bad references and check second in list', async () => {
			const db = dbMock();
			db.crownDevelopment.findMany.mock.mockImplementationOnce(() => [
				{ reference: 'bad-ref/here' },
				{ reference: 'CROWN/2022/0123456' }
			]);
			const ref = await newReference(db, new Date('2024-06-01T00:00:00.000Z'));
			assert.strictEqual(ref, 'CROWN/2024/0123457');
		});
	});
});
