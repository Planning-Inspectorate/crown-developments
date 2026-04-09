import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { buildSaveController, buildSuccessController, newReference } from './save.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { toCreateInput } from './save.js';

describe('save', () => {
	//I need to mock copyDriveItem which is a method of getSharepointDrive
	const today = new Date();
	const mockReference = `CROWN/${today.getFullYear()}/0000001`;
	describe('buildSaveController', () => {
		const dbMock = () => {
			return {
				crownDevelopment: {
					create: mock.fn(() => ({ id: 'id-1' })),
					findMany: mock.fn(() => []),
					update: mock.fn()
				},
				organisation: {
					create: mock.fn(() => ({ id: 'org-db-id-1' }))
				},
				contact: {
					create: mock.fn(() => ({ id: 'contact-db-id-1' }))
				},
				organisationToContact: {
					create: mock.fn(() => ({ id: 'org-to-contact-id-1' }))
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
				appSharePointDrive: null,
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
			service.appSharePointDrive = sharepointDrive;
			service.isMultipleApplicantsLive = false;
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
			service.appSharePointDrive = sharepointDrive;
			service.isMultipleApplicantsLive = false;
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
			service.appSharePointDrive = sharepointDrive;
			service.isMultipleApplicantsLive = false;
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
			service.appSharePointDrive = sharepointDrive;
			service.notifyClient = notifyClient;
			service.isMultipleApplicantsLive = false;
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
					reference: mockReference,
					sharePointLink: 'https://sharepoint.com/:f:/s/site/random_id',
					isLbcCase: false
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
			service.appSharePointDrive = sharepointDrive;
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
					reference: mockReference,
					sharePointLink: 'https://sharepoint.com/:f:/s/site/random_id',
					isLbcCase: false
				}
			]);
		});
		it('should send two emails when case type is planning permission and lbc', async () => {
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
				fetchUserInviteLink: mock.fn()
			};
			// Provide sequential implementations: first Planning, then LBC
			sharepointDrive.fetchUserInviteLink.mock.mockImplementationOnce(() => ({
				link: { webUrl: 'https://sharepoint.com/:f:/s/site/planning_link' }
			}));
			sharepointDrive.fetchUserInviteLink.mock.mockImplementation(() => ({
				link: { webUrl: 'https://sharepoint.com/:f:/s/site/lbc_link' }
			}));
			const notifyClient = {
				sendAcknowledgePreNotification: mock.fn()
			};
			const service = mockService();
			service.appSharePointDrive = sharepointDrive;
			service.notifyClient = notifyClient;
			service.isMultipleApplicantsLive = false;
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
			assert.strictEqual(notifyClient.sendAcknowledgePreNotification.mock.callCount(), 2);
			assert.deepStrictEqual(notifyClient.sendAcknowledgePreNotification.mock.calls[0].arguments, [
				'applicantEmail@mail.com',
				{
					reference: mockReference,
					sharePointLink: 'https://sharepoint.com/:f:/s/site/planning_link',
					isLbcCase: false
				}
			]);
			assert.deepStrictEqual(notifyClient.sendAcknowledgePreNotification.mock.calls[1].arguments, [
				'applicantEmail@mail.com',
				{
					reference: `${mockReference}/LBC`,
					sharePointLink: 'https://sharepoint.com/:f:/s/site/lbc_link',
					isLbcCase: true
				}
			]);
		});
		it('should throw an error if reference generation fails', async () => {
			const service = mockService();
			// Prevent the transaction callback from running so `reference` and `lbcReference`
			// are never set. This triggers the guard in save.js (line 80).
			service.db.$transaction = mock.fn(async () => undefined);

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

			await assert.rejects(() => save({}, res, mock.fn()), { message: 'Failed to generate case reference' });
		});
		it('should throw when answers is not an object', async () => {
			const save = buildSaveController(mockService());
			await assert.rejects(
				() =>
					save(
						{},
						{
							locals: {
								journeyResponse: {
									answers: 'not-an-object'
								}
							}
						}
					),
				{ message: 'answers should be an object' }
			);
		});

		it('should throw when sharepoint is enabled but template ID is not configured', async () => {
			const service = mockService();
			service.appSharePointDrive = { copyDriveItem: mock.fn() };
			service.sharePointCaseTemplateId = '';
			const save = buildSaveController(service);

			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project One',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1'
						}
					}
				}
			};

			await assert.rejects(() => save({}, res), {
				message:
					'SharePoint case template ID is not configured. Please set the sharePointCaseTemplateId environment variable.'
			});
		});

		it('should send email to many recipients when multiple applicants is live', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => [
					{ id: 'id1', name: 'Applicant' },
					{ id: 'id2', name: 'LPA' }
				]),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => ({
					link: { webUrl: 'https://sharepoint.com/:f:/s/site/random_id' }
				}))
			};

			const notifyClient = {
				sendAcknowledgePreNotificationToMany: mock.fn(),
				sendAcknowledgePreNotification: mock.fn()
			};

			const service = mockService();
			service.appSharePointDrive = sharepointDrive;
			service.notifyClient = notifyClient;
			service.isMultipleApplicantsLive = true;

			const save = buildSaveController(service);

			const answers = {
				developmentDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1',
				manageApplicantDetails: [{ id: 'org-id-1', organisationName: 'Org A', organisationAddress: {} }],
				manageApplicantContactDetails: [
					{
						applicantFirstName: 'Alex',
						applicantLastName: 'Smith',
						applicantContactEmail: 'alex@example.com',
						applicantContactTelephoneNumber: '1',
						applicantContactOrganisation: 'org-id-1'
					},
					{
						applicantFirstName: 'Sam',
						applicantLastName: 'Doe',
						applicantContactEmail: 'sam@example.com',
						applicantContactTelephoneNumber: '2',
						applicantContactOrganisation: 'org-id-1'
					}
				]
			};

			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res);

			assert.strictEqual(res.redirect.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.copyDriveItem.mock.callCount(), 1);
			assert.strictEqual(sharepointDrive.addItemPermissions.mock.callCount(), 1);
			assert.deepStrictEqual(sharepointDrive.addItemPermissions.mock.calls[0].arguments[1], {
				role: 'write',
				users: [
					{ email: 'alex@example.com', id: '' },
					{ email: 'sam@example.com', id: '' }
				]
			});

			assert.strictEqual(notifyClient.sendAcknowledgePreNotificationToMany.mock.callCount(), 1);
			assert.deepStrictEqual(notifyClient.sendAcknowledgePreNotificationToMany.mock.calls[0].arguments, [
				['alex@example.com', 'sam@example.com'],
				{
					reference: mockReference,
					sharePointLink: 'https://sharepoint.com/:f:/s/site/random_id',
					isLbcCase: false
				}
			]);
			assert.strictEqual(notifyClient.sendAcknowledgePreNotification.mock.callCount(), 0);
		});

		it('should grant write access to applicant and agent contacts when multiple applicants is live', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => [
					{ id: 'id1', name: 'Applicant' },
					{ id: 'id2', name: 'LPA' }
				]),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => ({
					link: { webUrl: 'https://sharepoint.com/:f:/s/site/random_id' }
				}))
			};

			const service = mockService();
			service.appSharePointDrive = sharepointDrive;
			service.isMultipleApplicantsLive = true;

			const save = buildSaveController(service);

			const answers = {
				developmentDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1',
				manageApplicantDetails: [{ id: 'org-id-1', organisationName: 'Org A', organisationAddress: {} }],
				manageApplicantContactDetails: [
					{
						applicantFirstName: 'Alex',
						applicantLastName: 'Smith',
						applicantContactEmail: 'alex@example.com',
						applicantContactTelephoneNumber: '1',
						applicantContactOrganisation: 'org-id-1'
					}
				],
				hasAgent: 'yes',
				agentOrganisationName: 'Agent Org',
				agentOrganisationAddress: {},
				manageAgentContactDetails: [
					{
						agentFirstName: 'Jamie',
						agentLastName: 'Jones',
						agentContactEmail: 'jamie@example.com',
						agentContactTelephoneNumber: '2'
					}
				]
			};

			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res);

			assert.strictEqual(sharepointDrive.addItemPermissions.mock.callCount(), 1);
			assert.deepStrictEqual(sharepointDrive.addItemPermissions.mock.calls[0].arguments[1], {
				role: 'write',
				users: [
					{ email: 'alex@example.com', id: '' },
					{ email: 'jamie@example.com', id: '' }
				]
			});
		});

		it('should only grant write access for contacts with an email when multiple applicants is live', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => [
					{ id: 'id1', name: 'Applicant' },
					{ id: 'id2', name: 'LPA' }
				]),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => ({
					link: { webUrl: 'https://sharepoint.com/:f:/s/site/random_id' }
				}))
			};

			const service = mockService();
			service.appSharePointDrive = sharepointDrive;
			service.isMultipleApplicantsLive = true;

			const save = buildSaveController(service);

			const answers = {
				developmentDescription: 'Project One',
				typeOfApplication: 'application-type-1',
				lpaId: 'lpa-1',
				manageApplicantDetails: [{ id: 'org-id-1', organisationName: 'Org A', organisationAddress: {} }],
				manageApplicantContactDetails: [
					{
						applicantFirstName: 'Alex',
						applicantLastName: 'Smith',
						applicantContactEmail: '',
						applicantContactTelephoneNumber: '1',
						applicantContactOrganisation: 'org-id-1'
					},
					{
						applicantFirstName: 'Sam',
						applicantLastName: 'Doe',
						applicantContactEmail: 'sam@example.com',
						applicantContactTelephoneNumber: '2',
						applicantContactOrganisation: 'org-id-1'
					}
				],
				hasAgent: 'yes',
				agentOrganisationName: 'Agent Org',
				agentOrganisationAddress: {},
				manageAgentContactDetails: [
					{
						agentFirstName: 'Jamie',
						agentLastName: 'Jones',
						agentContactEmail: null,
						agentContactTelephoneNumber: '3'
					}
				]
			};

			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res);

			assert.strictEqual(sharepointDrive.addItemPermissions.mock.callCount(), 1);
			assert.deepStrictEqual(sharepointDrive.addItemPermissions.mock.calls[0].arguments[1], {
				role: 'write',
				users: [{ email: 'sam@example.com', id: '' }]
			});
		});

		it('should throw when SharePoint invite link is missing in multiple applicants flow', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => [
					{ id: 'id1', name: 'Applicant' },
					{ id: 'id2', name: 'LPA' }
				]),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn(() => null)
			};

			const service = mockService();
			service.appSharePointDrive = sharepointDrive;
			service.isMultipleApplicantsLive = true;

			const save = buildSaveController(service);
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project One',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [{ id: 'org-id-1', organisationName: 'Org A', organisationAddress: {} }],
							manageApplicantContactDetails: [
								{
									applicantFirstName: 'Alex',
									applicantLastName: 'Smith',
									applicantContactEmail: 'alex@example.com',
									applicantContactTelephoneNumber: '1',
									applicantContactOrganisation: 'org-id-1'
								}
							]
						}
					}
				}
			};

			await assert.rejects(() => save({}, res), { message: 'Failed to get SharePoint invite link' });
		});

		it('should call sendAcknowledgePreNotificationToMany for planning and LBC and also send LBC acknowledgement', async () => {
			const sharepointDrive = {
				copyDriveItem: mock.fn(),
				getItemsByPath: mock.fn(() => [
					{ id: 'id1', name: 'Applicant' },
					{ id: 'id2', name: 'LPA' }
				]),
				addItemPermissions: mock.fn(),
				fetchUserInviteLink: mock.fn()
			};

			// createCaseSharePointActionsV2 requests an invite link twice per case.
			// First case = Planning (return planning link), second case = LBC (return LBC link from then on).
			let inviteLinkCalls = 0;
			sharepointDrive.fetchUserInviteLink.mock.mockImplementation(() => {
				inviteLinkCalls++;
				const webUrl =
					inviteLinkCalls < 2
						? 'https://sharepoint.com/:f:/s/site/planning_link'
						: 'https://sharepoint.com/:f:/s/site/lbc_link';

				return { link: { webUrl } };
			});

			const notifyClient = {
				sendAcknowledgePreNotificationToMany: mock.fn(),
				sendAcknowledgePreNotification: mock.fn()
			};

			const service = mockService();
			service.appSharePointDrive = sharepointDrive;
			service.notifyClient = notifyClient;
			service.isMultipleApplicantsLive = true;

			const save = buildSaveController(service);

			const answers = {
				developmentDescription: 'Project One',
				typeOfApplication: 'planning-permission-and-listed-building-consent',
				lpaId: 'lpa-1',
				manageApplicantDetails: [{ id: 'org-id-1', organisationName: 'Org A', organisationAddress: {} }],
				manageApplicantContactDetails: [
					{
						applicantFirstName: 'Alex',
						applicantLastName: 'Smith',
						applicantContactEmail: 'alex@example.com',
						applicantContactTelephoneNumber: '1',
						applicantContactOrganisation: 'org-id-1'
					}
				]
			};

			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await save({}, res);

			assert.strictEqual(notifyClient.sendAcknowledgePreNotificationToMany.mock.callCount(), 2);

			const bulkCalls = notifyClient.sendAcknowledgePreNotificationToMany.mock.calls.map((c) => c.arguments);

			assert.ok(
				bulkCalls.some(
					(args) =>
						JSON.stringify(args) ===
						JSON.stringify([
							['alex@example.com'],
							{
								reference: mockReference,
								sharePointLink: 'https://sharepoint.com/:f:/s/site/planning_link',
								isLbcCase: false
							}
						])
				),
				'Expected a bulk planning acknowledgement'
			);

			assert.ok(
				bulkCalls.some(
					(args) =>
						JSON.stringify(args) ===
						JSON.stringify([
							['alex@example.com'],
							{
								reference: `${mockReference}/LBC`,
								sharePointLink: 'https://sharepoint.com/:f:/s/site/lbc_link',
								isLbcCase: true
							}
						])
				),
				'Expected a bulk LBC acknowledgement'
			);

			assert.strictEqual(notifyClient.sendAcknowledgePreNotification.mock.callCount(), 0);
		});
		it('should create linked applicants and agents when case is Planning and LBC', async () => {
			const service = mockService();
			service.isMultipleApplicantsLive = true;
			const { db } = service;
			const save = buildSaveController(service);
			const answers = {
				applicantEmail: 'applicant@test.com',
				developmentDescription: 'Project One',
				typeOfApplication: 'planning-permission-and-listed-building-consent',
				lpaId: 'lpa-1',
				hasAgent: 'yes',
				agentOrganisationName: 'Agent Org',
				agentOrganisationAddress: {},
				manageAgentContactDetails: [
					{
						agentFirstName: 'Agent contact',
						agentLastName: 'one',
						agentContactEmail: 'agent1@test.com',
						agentContactTelephoneNumber: '123'
					}
				],
				manageApplicantDetails: [
					{
						id: 'applicant-org-1',
						organisationName: 'Applicant Org',
						organisationAddress: {
							addressLine1: '1 Test Street',
							addressLine2: '',
							townCity: 'Testville',
							county: 'Testshire',
							postcode: 'TE1 1ST'
						}
					}
				],
				manageApplicantContactDetails: [
					{
						applicantContactOrganisation: 'applicant-org-1',
						applicantFirstName: 'A',
						applicantLastName: 'Person',
						applicantContactEmail: 'applicant-contact@test.com',
						applicantContactTelephoneNumber: '0123456789'
					}
				]
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

			assert.strictEqual(db.organisation.create.mock.callCount(), 2);
			assert.strictEqual(
				db.contact.create.mock.callCount(),
				0,
				'Shared org/contact creation should be done via nested writes, not separate creates'
			);
			assert.strictEqual(
				db.organisationToContact.create.mock.callCount(),
				0,
				'Shared org/contact creation should be done via nested writes, not separate creates'
			);
			const orgCreateArgs = db.organisation.create.mock.calls[0].arguments[0];
			assert.ok(orgCreateArgs.data.OrganisationToContact);
			assert.ok(Array.isArray(orgCreateArgs.data.OrganisationToContact.create));
		});

		it('should connect both linked cases to the same shared organisations when case is Planning and LBC', async () => {
			const service = mockService();
			service.isMultipleApplicantsLive = true;
			const { db } = service;
			db.organisation.create.mock.mockImplementationOnce(() => ({ id: 'org-db-id-1' }));
			db.organisation.create.mock.mockImplementationOnce(() => ({ id: 'org-db-id-2' }));
			const save = buildSaveController(service);
			const answers = {
				developmentDescription: 'Project One',
				typeOfApplication: 'planning-permission-and-listed-building-consent',
				lpaId: 'lpa-1',
				hasAgent: 'yes',
				agentOrganisationName: 'Agent Org',
				agentOrganisationAddress: {},
				manageAgentContactDetails: [
					{
						agentFirstName: 'Agent contact',
						agentLastName: 'one',
						agentContactEmail: 'agent1@test.com',
						agentContactTelephoneNumber: '123'
					}
				],
				manageApplicantDetails: [
					{
						id: 'applicant-org-1',
						organisationName: 'Applicant Org',
						organisationAddress: {
							addressLine1: '1 Test Street',
							addressLine2: '',
							townCity: 'Testville',
							county: 'Testshire',
							postcode: 'TE1 1ST'
						}
					}
				],
				manageApplicantContactDetails: [
					{
						applicantContactOrganisation: 'applicant-org-1',
						applicantFirstName: 'A',
						applicantLastName: 'Person',
						applicantContactEmail: 'applicant-contact@test.com',
						applicantContactTelephoneNumber: '0123456789'
					}
				]
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

			assert.strictEqual(db.crownDevelopment.create.mock.callCount(), 2);
			assert.strictEqual(db.organisation.create.mock.callCount(), 2);

			const { data: caseData } = db.crownDevelopment.create.mock.calls[0].arguments[0];
			const { data: linkedCaseData } = db.crownDevelopment.create.mock.calls[1].arguments[0];
			assert.deepStrictEqual(
				caseData.Organisations,
				linkedCaseData.Organisations,
				'Organisations are not shared between cases'
			);
			assert.ok(Array.isArray(caseData.Organisations?.create));
			// Order of applicant/agent creation is not important, so sort before comparing
			assert.deepStrictEqual(caseData.Organisations.create.map((c) => c.Organisation.connect.id).sort(), [
				'org-db-id-1',
				'org-db-id-2'
			]);
		});

		it('should not create cases if shared organisation creation fails for linked case flow', async () => {
			const service = mockService();
			const { db } = service;
			const failure = new Error('Organisation create failed');
			db.organisation.create = mock.fn(() => {
				throw failure;
			});

			const save = buildSaveController(service);
			const answers = {
				applicantEmail: 'applicant@test.com',
				developmentDescription: 'Project One',
				typeOfApplication: 'planning-permission-and-listed-building-consent',
				lpaId: 'lpa-1',
				manageApplicantDetails: [
					{
						id: 'applicant-org-1',
						organisationName: 'Applicant Org',
						organisationAddress: {
							addressLine1: '1 Test Street',
							addressLine2: '',
							townCity: 'Testville',
							county: 'Testshire',
							postcode: 'TE1 1ST'
						}
					}
				],
				manageApplicantContactDetails: [
					{
						applicantContactOrganisation: 'applicant-org-1',
						applicantFirstName: 'A',
						applicantLastName: 'Person',
						applicantContactEmail: 'applicant-contact@test.com',
						applicantContactTelephoneNumber: '0123456789'
					}
				]
			};
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers
					}
				}
			};

			await assert.rejects(() => save({}, res, mock.fn()), /Organisation create failed/);
			assert.strictEqual(db.crownDevelopment.create.mock.callCount(), 0);
			assert.strictEqual(res.redirect.mock.callCount(), 0);
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
					findUnique: mock.fn(() => ({
						id: 'case-id',
						reference: 'case-ref',
						ChildrenCrownDevelopment: [{ id: 'linked-case-id', reference: 'linked-case-reference' }]
					}))
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
				title: 'Cases created',
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
	describe('toCreateInput', () => {
		it('should save secondaryLpa when hasSecondaryLpa is yes', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				hasSecondaryLpa: true,
				secondaryLpaId: 'lpa-2'
			};
			const input = toCreateInput(answers, 'ref-1', null);
			assert.strictEqual(input.hasSecondaryLpa, true);
			assert.deepStrictEqual(input.SecondaryLpa, { connect: { id: 'lpa-2' } });
		});
		it('should not save secondaryLpa when hasSecondaryLpa is no', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				hasSecondaryLpa: 'no',
				secondaryLpaId: 'lpa-2'
			};
			const input = toCreateInput(answers, 'ref-1', null);
			assert.strictEqual(input.hasSecondaryLpa, false);
			assert.strictEqual(input.SecondaryLpa, undefined);
		});
		it('should save Organisation name when it has one applicant', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				manageApplicantDetails: [
					{
						organisationName: 'Applicant One'
					}
				]
			};
			const input = toCreateInput(answers, 'ref-1', null);
			assert.deepStrictEqual(input.Organisations, {
				create: [
					{
						Organisation: {
							create: {
								name: 'Applicant One',
								Address: undefined
							}
						},
						Role: { connect: { id: 'applicant' } }
					}
				]
			});
		});
		it('should save Organisation address when at least one field is provided', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				manageApplicantDetails: [
					{
						organisationName: 'Applicant One',
						organisationAddress: {
							addressLine1: '123 Street'
						}
					}
				]
			};
			const input = toCreateInput(answers, 'ref-1', null);
			assert.deepStrictEqual(input.Organisations, {
				create: [
					{
						Organisation: {
							create: {
								name: 'Applicant One',
								Address: {
									create: {
										line1: '123 Street',
										line2: undefined,
										townCity: undefined,
										county: undefined,
										postcode: undefined
									}
								}
							}
						},
						Role: { connect: { id: 'applicant' } }
					}
				]
			});
		});
		it('should save all Organisation address when they are provided', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				manageApplicantDetails: [
					{
						organisationName: 'Applicant One',
						organisationAddress: {
							addressLine1: '123 Street',
							addressLine2: 'Line 2',
							townCity: 'Town',
							county: 'County',
							postcode: 'POSTCODE'
						}
					}
				]
			};
			const input = toCreateInput(answers, 'ref-1', null);
			assert.deepStrictEqual(input.Organisations, {
				create: [
					{
						Organisation: {
							create: {
								name: 'Applicant One',
								Address: {
									create: {
										line1: '123 Street',
										line2: 'Line 2',
										townCity: 'Town',
										county: 'County',
										postcode: 'POSTCODE'
									}
								}
							}
						},
						Role: { connect: { id: 'applicant' } }
					}
				]
			});
		});
		it('should save containsDistressingContent as true when it is yes', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				containsDistressingContent: 'yes'
			};
			const input = toCreateInput(answers, 'ref-1', null);
			//TODO: check typed once generated
			assert.strictEqual(input.containsDistressingContent, true);
		});
		it('should save containsDistressingContent as false when it is no', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				containsDistressingContent: 'no'
			};
			const input = toCreateInput(answers, 'ref-1', null);
			assert.strictEqual(input.containsDistressingContent, false);
		});
		it('should include both agent and applicant organisations when a case has an agent and applicants', () => {
			const answers = {
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1',
				hasAgent: 'yes',
				agentOrganisationName: 'Agent Org',
				manageAgentContactDetails: [
					{
						agentFirstName: 'A',
						agentLastName: 'One',
						agentEmail: 'a.one@example.com',
						agentTelephoneNumber: '123'
					}
				],
				manageApplicantDetails: [
					{
						organisationName: 'Applicant One'
					}
				]
			};

			const input = toCreateInput(answers, 'ref-1', null);
			assert.strictEqual(input.hasAgent, true);
			assert.ok(input.Organisations);
			assert.ok(Array.isArray(input.Organisations.create));

			const orgCreates = input.Organisations.create;
			assert.strictEqual(orgCreates.length, 2);
			assert.deepStrictEqual(orgCreates[0].Role, { connect: { id: 'applicant' } });
			assert.deepStrictEqual(orgCreates[1].Role, { connect: { id: 'agent' } });

			const names = orgCreates.map((o) => o.Organisation.create.name);
			assert.deepStrictEqual(names, ['Applicant One', 'Agent Org']);

			const agentOrg = orgCreates[1].Organisation.create;
			assert.ok(agentOrg.OrganisationToContact);
		});
		it('should include agent organisation and contacts when agent is present', () => {
			const answers = {
				hasAgent: 'yes',
				agentOrganisationName: 'Agent Org',
				agentOrganisationAddress: { addressLine1: '1 Street', postcode: 'AB1 2CD' },
				manageAgentContactDetails: [
					{
						agentFirstName: 'Alice',
						agentLastName: 'Smith',
						agentEmail: 'alice@example.com',
						agentTelephoneNumber: '123'
					}
				],
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1'
			};
			const input = toCreateInput(answers, 'ref-1', null);
			const orgs = input.Organisations.create;
			assert.strictEqual(orgs.length, 1);
			assert.strictEqual(orgs[0].Organisation.create.name, 'Agent Org');
			assert.ok(orgs[0].Organisation.create.Address);
			assert.strictEqual(orgs[0].Organisation.create.OrganisationToContact.create.length, 1);
			assert.strictEqual(orgs[0].Organisation.create.OrganisationToContact.create[0].Contact.create.firstName, 'Alice');
			assert.deepStrictEqual(orgs[0].Role, {
				connect: { id: 'agent' }
			});
		});

		it('should not include agent organisation if hasAgent is no', () => {
			const answers = {
				hasAgent: 'no',
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1'
			};
			const input = toCreateInput(answers, 'ref-1', null);
			assert.strictEqual(input.hasAgent, false);
			assert.ok(
				!input.Organisations || !input.Organisations.create.some((o) => o.Organisation.create.name === 'Agent Org')
			);
		});

		it('should throw error if agentOrganisationName is missing but hasAgent is yes', () => {
			const answers = {
				hasAgent: 'yes',
				manageAgentContactDetails: [{ agentFirstName: 'A' }],
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1'
			};
			assert.throws(() => toCreateInput(answers, 'ref-1', null), /Agent name is required when the case has an agent/);
		});

		it('should not create address for agent if all address fields are empty', () => {
			const answers = {
				hasAgent: 'yes',
				agentOrganisationName: 'Agent Org',
				agentOrganisationAddress: { addressLine1: '', postcode: '' },
				manageAgentContactDetails: [{ agentFirstName: 'A' }],
				developmentDescription: 'desc',
				typeOfApplication: 'type',
				lpaId: 'lpa-1'
			};
			const input = toCreateInput(answers, 'ref-1', null);
			const org = input.Organisations.create[0].Organisation.create;
			assert.strictEqual(org.Address, undefined);
		});
	});
	describe('save applicant contacts linked to organisations', () => {
		const buildDbMock = () => {
			return {
				crownDevelopment: {
					create: mock.fn(() => ({ id: 'crown-dev-id-1' })),
					findMany: mock.fn(() => [])
				},
				$transaction(fn) {
					return fn(this);
				}
			};
		};

		const buildServiceMock = () => {
			return {
				sharePointCaseTemplateId: 'template-id',
				db: buildDbMock(),
				logger: mockLogger(),
				appSharePointDrive: null,
				notifyClient: null
			};
		};

		it('should create organisation-to-contact relationships using ID matching', async () => {
			const service = buildServiceMock();
			const save = buildSaveController(service);
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [{ id: 'org-id-1', organisationName: 'Org A', organisationAddress: {} }],
							manageApplicantContactDetails: [
								{
									applicantFirstName: 'Alex',
									applicantLastName: 'Smith',
									applicantContactEmail: 'alex@example.com',
									applicantContactTelephoneNumber: '1',
									applicantContactOrganisation: 'org-id-1'
								}
							]
						}
					}
				}
			};
			await save({}, res);
			const createArgs = service.db.crownDevelopment.create.mock.calls[0].arguments[0];
			const orgCreates = createArgs.data.Organisations.create;
			assert.deepStrictEqual(orgCreates[0].Role, { connect: { id: 'applicant' } });
			const orgA = orgCreates[0].Organisation.create;
			assert.strictEqual(orgA.OrganisationToContact.create.length, 1);
			assert.strictEqual(orgA.OrganisationToContact.create[0].Contact.create.firstName, 'Alex');
		});

		it('should create organisation-to-contact relationships for multiple contacts and organisations', async () => {
			const service = buildServiceMock();
			// findUnique is no longer called for organisations
			service.db.crownDevelopment.findUnique = mock.fn(() => null);

			const save = buildSaveController(service);

			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [
								{
									id: 'org-id-A',
									organisationName: 'Org A',
									organisationAddress: {}
								},
								{
									id: 'org-id-B',
									organisationName: 'Org B',
									organisationAddress: {}
								}
							],
							manageApplicantContactDetails: [
								{
									applicantFirstName: 'Alex',
									applicantLastName: 'Smith',
									applicantContactEmail: 'alex@example.com',
									applicantContactTelephoneNumber: '0123456789',
									applicantContactOrganisation: 'org-id-A'
								},
								{
									applicantFirstName: 'Jamie',
									applicantLastName: 'Jones',
									applicantContactEmail: 'jamie@example.com',
									applicantContactTelephoneNumber: '',
									applicantContactOrganisation: 'org-id-B'
								},
								{
									applicantFirstName: 'Sam',
									applicantLastName: 'Doe',
									applicantContactEmail: 'sam@example.com',
									applicantContactTelephoneNumber: '',
									applicantContactOrganisation: 'org-id-A'
								}
							]
						}
					}
				}
			};

			await save({}, res);

			assert.strictEqual(service.db.crownDevelopment.create.mock.callCount(), 1);

			const createArgs = service.db.crownDevelopment.create.mock.calls[0].arguments[0];
			const orgCreates = createArgs.data.Organisations.create;

			assert.strictEqual(orgCreates.length, 2);

			// Org A should have Alex Smith and Sam Doe
			const orgA = orgCreates[0].Organisation.create;
			assert.strictEqual(orgA.name, 'Org A');
			assert.ok(orgA.OrganisationToContact);
			const contactsA = orgA.OrganisationToContact.create;
			assert.strictEqual(contactsA.length, 2);

			assert.strictEqual(contactsA[0].Contact.create.firstName, 'Alex');
			assert.strictEqual(contactsA[1].Contact.create.firstName, 'Sam');

			// Org B should have Jamie Jones
			const orgB = orgCreates[1].Organisation.create;
			assert.strictEqual(orgB.name, 'Org B');
			assert.ok(orgB.OrganisationToContact);
			const contactsB = orgB.OrganisationToContact.create;
			assert.strictEqual(contactsB.length, 1);
			assert.strictEqual(contactsB[0].Contact.create.firstName, 'Jamie');
		});

		it('should throw error if applicantContactOrganisation does not match any organisation ID', async () => {
			const service = buildServiceMock();
			const save = buildSaveController(service);
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [{ id: 'org-id-3', organisationName: 'Org C', organisationAddress: {} }],
							manageApplicantContactDetails: [
								{
									applicantFirstName: 'Unmatched',
									applicantLastName: 'Applicant',
									applicantContactEmail: 'unmatched@example.com',
									applicantContactTelephoneNumber: '4',
									applicantContactOrganisation: 'non-existent-id'
								},
								{
									applicantFirstName: 'Kit',
									applicantLastName: 'Swift',
									applicantContactEmail: 'kit@example.com',
									applicantContactTelephoneNumber: '4',
									applicantContactOrganisation: 'org-id-3'
								}
							]
						}
					}
				}
			};
			await assert.rejects(
				() => save({}, res),
				(error) =>
					error.message.includes(
						'Found an orphaned contact with selector "non-existent-id" that does not match any organisation'
					)
			);
		});

		it('should throw error if applicantContactOrganisation is missing or empty', async () => {
			const service = buildServiceMock();
			const save = buildSaveController(service);
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [{ id: 'org-id-4', organisationName: 'Org D', organisationAddress: {} }],
							manageApplicantContactDetails: [
								{
									applicantFirstName: 'Rowan',
									applicantLastName: 'Pine',
									applicantContactEmail: 'rowan@example.com',
									applicantContactTelephoneNumber: '5'
								}
							]
						}
					}
				}
			};
			await assert.rejects(
				() => save({}, res),
				(error) => error.message.includes('Unable to match applicant contact to organisation - no valid selector')
			);
		});

		it('should not link contact to wrong organisation if names are duplicated, only matches by ID', async () => {
			const service = buildServiceMock();
			const save = buildSaveController(service);
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [
								{ id: 'org-id-5', organisationName: 'Org E', organisationAddress: {} },
								{ id: 'org-id-6', organisationName: 'Org E', organisationAddress: {} }
							],
							manageApplicantContactDetails: [
								{
									applicantFirstName: 'Jordan',
									applicantLastName: 'Smith',
									applicantContactEmail: 'jordan@example.com',
									applicantContactTelephoneNumber: '6',
									applicantContactOrganisation: 'org-id-6'
								},
								{
									applicantFirstName: 'Bordan',
									applicantLastName: 'Smith',
									applicantContactEmail: 'bordan@example.com',
									applicantContactTelephoneNumber: '1',
									applicantContactOrganisation: 'org-id-5'
								}
							]
						}
					}
				}
			};
			await save({}, res);
			const createArgs = service.db.crownDevelopment.create.mock.calls[0].arguments[0];
			const orgCreates = createArgs.data.Organisations.create;
			const orgE1 = orgCreates[0].Organisation.create;
			const orgE2 = orgCreates[1].Organisation.create;
			assert.ok(orgE1.OrganisationToContact);
			assert.strictEqual(orgE1.OrganisationToContact.create[0].Contact.create.firstName, 'Bordan');
			assert.ok(orgE2.OrganisationToContact);
			assert.strictEqual(orgE2.OrganisationToContact.create[0].Contact.create.firstName, 'Jordan');
		});

		it('should handle minimal input: one org, one contact', async () => {
			const service = buildServiceMock();
			const save = buildSaveController(service);
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [{ id: 'org-id-7', organisationName: 'Org F', organisationAddress: {} }],
							manageApplicantContactDetails: [
								{
									applicantFirstName: 'Kit',
									applicantLastName: 'Swift',
									applicantContactEmail: 'kit@example.com',
									applicantContactTelephoneNumber: '7',
									applicantContactOrganisation: 'org-id-7'
								}
							]
						}
					}
				}
			};
			await save({}, res);
			const createArgs = service.db.crownDevelopment.create.mock.calls[0].arguments[0];
			const orgCreates = createArgs.data.Organisations.create;
			const orgF = orgCreates[0].Organisation.create;
			assert.ok(orgF.OrganisationToContact);
			assert.strictEqual(orgF.OrganisationToContact.create.length, 1);
			assert.strictEqual(orgF.OrganisationToContact.create[0].Contact.create.firstName, 'Kit');
		});

		it('should handle minimal input: empty arrays', async () => {
			const service = buildServiceMock();
			const save = buildSaveController(service);
			const res = {
				redirect: mock.fn(),
				locals: {
					journeyResponse: {
						answers: {
							developmentDescription: 'Project',
							typeOfApplication: 'application-type-1',
							lpaId: 'lpa-1',
							manageApplicantDetails: [],
							manageApplicantContactDetails: []
						}
					}
				}
			};
			await save({}, res);
			const createArgs = service.db.crownDevelopment.create.mock.calls[0].arguments[0];
			assert.strictEqual(createArgs.data.Organisations, undefined);
		});
	});
});
