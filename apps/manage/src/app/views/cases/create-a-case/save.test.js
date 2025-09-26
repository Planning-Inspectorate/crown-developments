import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController, buildSuccessController, newReference } from './save.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';

describe('save', () => {
	//I need to mock copyDriveItem which is a method of getSharepointDrive
	describe('buildSaveController', () => {
		const dbMock = () => {
			return {
				crownDevelopment: {
					create: mock.fn(() => ({ id: 'id-1' })),
					findMany: mock.fn(() => []),
					update: mock.fn()
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
				developmentDescription: 'Project One',
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
				developmentDescription: 'Project One',
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

		it('should create linked case and sharepoint folder when case is Planning and LBC', async () => {
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
			const service = mockService();
			service.getSharePointDrive = () => sharepointDrive;
			const { db } = service;
			const save = buildSaveController(service);
			const answers = {
				applicantEmail: 'applicant@test.com',
				developmentDescription: 'Project One',
				typeOfApplication: 'planning-permission-and-listed-building-consent',
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

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(service.db.crownDevelopment.create.mock.callCount(), 2);

			const { data: caseData } = db.crownDevelopment.create.mock.calls[0].arguments[0];
			assert.deepStrictEqual(caseData.Type, { connect: { id: 'planning-permission-and-listed-building-consent' } });
			assert.deepStrictEqual(caseData.SubType, { connect: { id: 'planning-permission' } });

			const { data: linkedCaseData } = db.crownDevelopment.create.mock.calls[1].arguments[0];
			assert.deepStrictEqual(linkedCaseData.Type, {
				connect: { id: 'planning-permission-and-listed-building-consent' }
			});
			assert.deepStrictEqual(linkedCaseData.SubType, { connect: { id: 'listed-building-consent' } });
			assert.deepStrictEqual(linkedCaseData.ParentCrownDevelopment, { connect: { id: 'id-1' } });

			assert.strictEqual(sharepointDrive.copyDriveItem.mock.callCount(), 2);
			assert.strictEqual(sharepointDrive.getItemsByPath.mock.callCount(), 2);
			assert.strictEqual(sharepointDrive.addItemPermissions.mock.callCount(), 2);
			assert.deepStrictEqual(sharepointDrive.addItemPermissions.mock.calls[0].arguments[1], {
				role: 'write',
				users: [{ email: answers.applicantEmail, id: '' }]
			});
			assert.deepStrictEqual(sharepointDrive.addItemPermissions.mock.calls[1].arguments[1], {
				role: 'write',
				users: [{ email: answers.applicantEmail, id: '' }]
			});
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
				developmentDescription: 'Project One',
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
				developmentDescription: 'Project One',
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
				developmentDescription: 'Project One',
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
				developmentDescription: 'Project One',
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
		it('should not send email when case type is planning permission and lbc', async () => {
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
				developmentDescription: 'Project One',
				typeOfApplication: 'planning-permission-and-listed-building-consent',
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
			assert.strictEqual(notifyClient.sendAcknowledgePreNotification.mock.callCount(), 0);
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
	describe('buildSuccessController', () => {
		it('should build success page when there is no linked case', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => {})
				}
			};
			const mockReq = {
				session: {
					forms: {
						'create-a-case': {
							id: 'case-id',
							reference: 'case-ref',
							hasAgent: false,
							applicantEmail: 'applicantEmail@mail.com',
							agentEmail: 'agentEmail@mail.com'
						}
					}
				}
			};
			const mockRes = {
				render: mock.fn()
			};
			const successController = buildSuccessController({ db: mockDb });
			await successController(mockReq, mockRes);

			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/create-a-case/success.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				title: 'Case created',
				bodyText: 'Case reference <br><strong>case-ref</strong>',
				successBackLinkUrl: '/cases/case-id',
				successBackLinkText: 'View case details for case-ref',
				hasLinkedCase: false,
				successBackLinkLinkedCaseUrl: '',
				successBackLinkLinkedCaseText: ''
			});
		});
		it('should build the success page when there is a linked case', async () => {
			const mockDb = {
				crownDevelopment: {
					findUnique: (() => {
						const responses = [
							{ id: 'case-id', linkedParentId: 'linked-case-id' },
							{ id: 'linked-case-id', reference: 'linked-case-reference' }
						];
						return mock.fn(() => responses.shift());
					})()
				}
			};
			const mockReq = {
				session: {
					forms: {
						'create-a-case': {
							id: 'case-id',
							reference: 'case-ref',
							hasAgent: false,
							applicantEmail: 'applicantEmail@mail.com',
							agentEmail: 'agentEmail@mail.com'
						}
					}
				}
			};
			const mockRes = {
				render: mock.fn()
			};
			const successController = buildSuccessController({ db: mockDb });
			await successController(mockReq, mockRes);

			assert.strictEqual(mockDb.crownDevelopment.findUnique.mock.callCount(), 2);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/cases/create-a-case/success.njk');
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				title: 'Case created',
				bodyText: 'Case reference <br><strong>case-ref</strong><br><br><strong>linked-case-reference</strong>',
				successBackLinkUrl: '/cases/case-id',
				successBackLinkText: 'View case details for case-ref',
				hasLinkedCase: true,
				successBackLinkLinkedCaseUrl: '/cases/linked-case-id',
				successBackLinkLinkedCaseText: 'View case details for linked-case-reference'
			});
		});
		it('should throw error when no data object', async () => {
			const successController = buildSuccessController({});
			await assert.rejects(() => successController({}, {}), { message: 'invalid create case session' });
		});
		it('should throw error when no id exists in data object', async () => {
			const mockReq = {
				session: {
					forms: {
						'create-a-case': {
							reference: 'ref',
							hasAgent: false,
							applicantEmail: 'applicantEmail@mail.com',
							agentEmail: 'agentEmail@mail.com'
						}
					}
				}
			};
			const successController = buildSuccessController({});
			await assert.rejects(() => successController(mockReq, {}), { message: 'invalid create case session' });
		});
		it('should throw error when no reference exists in data object', async () => {
			const mockReq = {
				session: {
					forms: {
						'create-a-case': {
							id: 'id',
							hasAgent: false,
							applicantEmail: 'applicantEmail@mail.com',
							agentEmail: 'agentEmail@mail.com'
						}
					}
				}
			};
			const successController = buildSuccessController({});
			await assert.rejects(() => successController(mockReq, {}), { message: 'invalid create case session' });
		});
	});
});
