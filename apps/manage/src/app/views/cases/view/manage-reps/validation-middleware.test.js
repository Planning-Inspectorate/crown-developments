import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildValidateRedactedFileMiddleware, buildValidateRepresentationMiddleware } from './validation-middleware.js';
import {
	REPRESENTATION_CATEGORY_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.js';
import { mockLogger } from '@pins/crowndev-lib/testing/mock-logger.js';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';

describe('validate-representation-middleware', () => {
	describe('Myself', () => {
		it('should return next if no errors are found', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
						submittedDate: new Date('2025-03-31T03:24:00'),
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: false
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(mockReq.session, {});
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
		it('should redirect and add errors to session when they are missing', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(
				mockReq.session.representations['456'].errors.some((value) => {
					return (
						value.text === 'Enter the representation received date' &&
						value.href === '/cases/123/manage-representations/456/edit/details/representation-date'
					);
				}),
				true
			);
			assert.deepStrictEqual(
				mockReq.session.representations['456'].errors.some((value) => {
					return (
						value.text === 'Enter a representation type' &&
						value.href === '/cases/123/manage-representations/456/edit/details/representation-type'
					);
				}),
				true
			);
			assert.deepStrictEqual(
				mockReq.session.representations['456'].errors.some((value) => {
					return (
						value.text === 'Enter the hearing preference' &&
						value.href === '/cases/123/manage-representations/456/edit/myself/hearing-preference'
					);
				}),
				true
			);
			assert.strictEqual(mockNext.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
		});
	});
	describe('On behalf of', () => {
		it('should redirect and add representedTypeId error to session when missing', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						submittedDate: new Date('2025-03-31T03:24:00'),
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: false,
						submittedByAgent: true,
						submittedByAgentOrgName: 'Agent organisation',
						RepresentedContact: {
							firstName: 'John',
							lastName: 'Doe'
						}
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(mockReq.session, {
				representations: {
					456: {
						errors: [
							{
								text: 'Enter who they are representing',
								href: '/cases/123/manage-representations/456/edit/agent/who-representing'
							}
						]
					}
				}
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
		});
		describe('Person', () => {
			it('should return next if no errors are found in representing on behalf of a person', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.PERSON,
							submittedDate: new Date('2025-03-31T03:24:00'),
							categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
							wantsToBeHeard: false,
							submittedByAgent: true,
							submittedByAgentOrgName: 'Agent organisation',
							RepresentedContact: {
								firstName: 'John',
								lastName: 'Doe'
							}
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(mockReq.session, {});
				assert.strictEqual(mockNext.mock.callCount(), 1);
			});
			it('should redirect and multiple errors to session when they are missing', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.PERSON
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the representation received date' &&
							value.href === '/cases/123/manage-representations/456/edit/details/representation-date'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter a representation type' &&
							value.href === '/cases/123/manage-representations/456/edit/details/representation-type'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the hearing preference' &&
							value.href === '/cases/123/manage-representations/456/edit/agent/hearing-preference'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter if they are acting as an agent on behalf of a client' &&
							value.href === '/cases/123/manage-representations/456/edit/agent/are-you-agent'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === "Enter the represented person's name" &&
							value.href === '/cases/123/manage-representations/456/edit/agent/name-person-representing'
						);
					}),
					true
				);
				assert.strictEqual(mockNext.mock.callCount(), 0);
				assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
				assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
			});
			it('should redirect and add agent org name errors to session when missing and its an agent', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.PERSON,
							submittedDate: new Date('2025-03-31T03:24:00'),
							categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
							wantsToBeHeard: false,
							submittedByAgent: true,
							RepresentedContact: {
								firstName: 'John',
								lastName: 'Doe'
							}
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === "Enter the agent's organisation name" &&
							value.href === '/cases/123/manage-representations/456/edit/agent/agent-organisation-name'
						);
					}),
					true
				);
				assert.strictEqual(mockNext.mock.callCount(), 0);
				assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
				assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
			});
		});
		describe('Organisation I work for', () => {
			it('should return next if no errors are found in representing on behalf of a organisation that I do work for', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION,
							submittedDate: new Date('2025-03-31T03:24:00'),
							categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
							wantsToBeHeard: false,
							SubmittedByContact: {
								jobTitleOrRole: 'My role'
							},
							RepresentedContact: {
								orgName: 'Org I work for'
							}
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(mockReq.session, {});
				assert.strictEqual(mockNext.mock.callCount(), 1);
			});
			it('should redirect and multiple errors to session when they are missing', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.ORGANISATION
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the representation received date' &&
							value.href === '/cases/123/manage-representations/456/edit/details/representation-date'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter a representation type' &&
							value.href === '/cases/123/manage-representations/456/edit/details/representation-type'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the hearing preference' &&
							value.href === '/cases/123/manage-representations/456/edit/agent/hearing-preference'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the organisation or charity name' &&
							value.href === '/cases/123/manage-representations/456/edit/agent/name-organisation'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === "Enter the agent's job role" &&
							value.href === '/cases/123/manage-representations/456/edit/agent/what-job-title-or-role'
						);
					}),
					true
				);
				assert.strictEqual(mockNext.mock.callCount(), 0);
				assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
				assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
			});
		});
		describe('Organisation I dont work for', () => {
			it('should return next if no errors are found in representing on behalf of a organisation that I dont work for', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
							submittedDate: new Date('2025-03-31T03:24:00'),
							categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
							wantsToBeHeard: false,
							submittedByAgent: true,
							submittedByAgentOrgName: 'Agent organisation',
							RepresentedContact: {
								orgName: 'Org I dont work for'
							}
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(mockReq.session, {});
				assert.strictEqual(mockNext.mock.callCount(), 1);
			});
			it('should redirect and multiple errors to session when they are missing', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the representation received date' &&
							value.href === '/cases/123/manage-representations/456/edit/details/representation-date'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter a representation type' &&
							value.href === '/cases/123/manage-representations/456/edit/details/representation-type'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the hearing preference' &&
							value.href === '/cases/123/manage-representations/456/edit/agent/hearing-preference'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter if they are acting as an agent on behalf of a client' &&
							value.href === '/cases/123/manage-representations/456/edit/agent/are-you-agent'
						);
					}),
					true
				);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === 'Enter the full name of the organisation you are representing' &&
							value.href === '/cases/123/manage-representations/456/edit/agent/name-organisation-representing'
						);
					}),
					true
				);
				assert.strictEqual(mockNext.mock.callCount(), 0);
				assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
				assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
			});
			it('should redirect and add agent org name errors to session when missing and its an agent', async () => {
				const mockReq = {
					params: {
						id: '123',
						representationRef: '456'
					},
					session: {},
					baseUrl: `/cases/123/manage-representations/456/review`
				};
				const mockRes = {
					redirect: mock.fn()
				};
				const mockNext = mock.fn();
				const mockDb = {
					representation: {
						findUnique: mock.fn(() => ({
							id: 'id-1',
							referenceRef: '456',
							submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
							representedTypeId: REPRESENTED_TYPE_ID.ORG_NOT_WORK_FOR,
							submittedDate: new Date('2025-03-31T03:24:00'),
							categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
							wantsToBeHeard: false,
							submittedByAgent: true,
							RepresentedContact: {
								orgName: 'Org I dont work for'
							}
						}))
					}
				};
				const logger = mockLogger();
				const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
				await validatedRepresentation(mockReq, mockRes, mockNext);
				assert.deepStrictEqual(
					mockReq.session.representations['456'].errors.some((value) => {
						return (
							value.text === "Enter the agent's organisation name" &&
							value.href === '/cases/123/manage-representations/456/edit/agent/agent-organisation-name'
						);
					}),
					true
				);
				assert.strictEqual(mockNext.mock.callCount(), 0);
				assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
				assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
			});
		});
	});
	describe('Edge cases', () => {
		it('should throw when id is not in params', async () => {
			const mockReq = {
				params: {
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
						submittedDate: new Date('2025-03-31T03:24:00'),
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: false
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await assert.rejects(() => validatedRepresentation(mockReq, mockRes, mockNext), { message: 'id param required' });
		});
		it('should throw when representationRef is not in params', async () => {
			const mockReq = {
				params: {
					id: '123'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
						submittedDate: new Date('2025-03-31T03:24:00'),
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: false
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await assert.rejects(() => validatedRepresentation(mockReq, mockRes, mockNext), {
				message: 'representationRef param required'
			});
		});
		it('redirect to a 404 page if the representation is not found', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockDb = {
				representation: {
					findUnique: mock.fn()
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await assertRenders404Page(validatedRepresentation, mockReq, true);
		});
		it('should redirect and add who submitted for to session when missing', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedDate: new Date('2025-03-31T03:24:00'),
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: true
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(mockReq.session, {
				representations: {
					456: {
						errors: [
							{
								text: 'Enter who the representation is submitted for',
								href: '/cases/123/manage-representations/456/edit/start/who-submitted-for'
							}
						]
					}
				}
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
		});
		it('should recognise false as values when handling requiredAnswers', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedDate: new Date('2025-03-31T03:24:00'),
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: false
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(mockReq.session, {});
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
		it('should recognise 0 as values when handling requiredAnswers', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedDate: new Date('2025-03-31T03:24:00'),
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: 0
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(mockReq.session, {});
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
		it('should register empty strings as missing when handling requiredAnswers', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedDate: new Date('2025-03-31T03:24:00'),
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: ''
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(mockReq.session, {
				representations: {
					456: {
						errors: [
							{
								text: 'Enter the hearing preference',
								href: '/cases/123/manage-representations/456/edit/myself/hearing-preference'
							}
						]
					}
				}
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
		});
		it('should register null as missing when handling requiredAnswers', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				representation: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						referenceRef: '456',
						submittedDate: new Date('2025-03-31T03:24:00'),
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
						categoryId: REPRESENTATION_CATEGORY_ID.CONSULTEES,
						wantsToBeHeard: null
					}))
				}
			};
			const logger = mockLogger();
			const validatedRepresentation = buildValidateRepresentationMiddleware({ db: mockDb, logger });
			await validatedRepresentation(mockReq, mockRes, mockNext);
			assert.deepStrictEqual(mockReq.session, {
				representations: {
					456: {
						errors: [
							{
								text: 'Enter the hearing preference',
								href: '/cases/123/manage-representations/456/edit/myself/hearing-preference'
							}
						]
					}
				}
			});
			assert.strictEqual(mockNext.mock.callCount(), 0);
			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], mockReq.baseUrl);
		});
	});
	describe('buildValidateRedactedFileMiddleware', () => {
		it('should return next if no errors are found', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456',
					itemId: '123'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`,
				files: [
					{
						itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
						originalname: 'test-pdf.pdf',
						mimeType: 'application/pdf',
						size: 227787
					}
				]
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						reference: 'CROWN/2025/0000001'
					}))
				},
				representationDocument: {
					findFirst: mock.fn(() => ({
						fileName: 'test.pdf'
					}))
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [{ name: 'test5.pdf', size: 123456 }])
			};
			const logger = mockLogger();

			const validatedRedactedFile = buildValidateRedactedFileMiddleware({
				db: mockDb,
				logger,
				getSharePointDrive: () => mockSharePoint
			});
			await validatedRedactedFile(mockReq, mockRes, mockNext);

			assert.deepStrictEqual(mockReq.session, {});
			assert.strictEqual(mockNext.mock.callCount(), 1);
		});
		it('should return errors if original attachment has the same name', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456',
					itemId: '123'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review/task-list/123`,
				body: {},
				files: [
					{
						itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
						originalname: 'test-pdf.pdf',
						mimeType: 'application/pdf',
						size: 227787
					}
				]
			};
			const mockRes = {
				render: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						reference: 'CROWN/2025/0000001'
					}))
				},
				representationDocument: {
					findFirst: mock.fn(() => ({
						fileName: 'test-pdf.pdf'
					}))
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [{ name: 'test5.pdf', size: 123456 }])
			};
			const logger = mockLogger();

			const validatedRedactedFile = buildValidateRedactedFileMiddleware({
				db: mockDb,
				logger,
				getSharePointDrive: () => mockSharePoint
			});
			await validatedRedactedFile(mockReq, mockRes, mockNext);

			assert.deepStrictEqual(mockReq.session, {});
			assert.strictEqual(mockNext.mock.callCount(), 0);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: '456',
				originalFileId: '123',
				fileName: 'test-pdf.pdf',
				redactedFileId: undefined,
				redactedFileName: undefined,
				allowedMimeTypes: [
					'application/pdf',
					'image/png',
					'image/jpeg',
					'image/tiff',
					'application/msword',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				],
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: '/cases/123/manage-representations/456/review/task-list/123',
				currentUrl: '/cases/123/manage-representations/456/review/task-list/123/redact',
				errors: { 'upload-form': { msg: 'Original attachment has the same name' } },
				errorSummary: [
					{
						text: 'Original attachment has the same name',
						href: '#upload-form'
					}
				],
				shouldShowHintText: false
			});
		});
		it('should return errors if file with same name already exists in sharepoint folder', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456',
					itemId: '123'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review/task-list/123`,
				body: {},
				files: [
					{
						itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
						originalname: 'test5.pdf',
						mimeType: 'application/pdf',
						size: 227787
					}
				]
			};
			const mockRes = {
				render: mock.fn()
			};
			const mockNext = mock.fn();
			const mockDb = {
				crownDevelopment: {
					findUnique: mock.fn(() => ({
						id: 'id-1',
						reference: 'CROWN/2025/0000001'
					}))
				},
				representationDocument: {
					findFirst: mock.fn(() => ({
						fileName: 'test-pdf.pdf'
					}))
				}
			};
			const mockSharePoint = {
				getItemsByPath: mock.fn(() => [{ name: 'test5.pdf', size: 123456 }])
			};
			const logger = mockLogger();

			const validatedRedactedFile = buildValidateRedactedFileMiddleware({
				db: mockDb,
				logger,
				getSharePointDrive: () => mockSharePoint
			});
			await validatedRedactedFile(mockReq, mockRes, mockNext);

			assert.deepStrictEqual(mockReq.session, {});
			assert.strictEqual(mockNext.mock.callCount(), 0);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.deepStrictEqual(mockRes.render.mock.calls[0].arguments[1], {
				reference: '456',
				originalFileId: '123',
				fileName: 'test-pdf.pdf',
				redactedFileId: undefined,
				redactedFileName: undefined,
				allowedMimeTypes: [
					'application/pdf',
					'image/png',
					'image/jpeg',
					'image/tiff',
					'application/msword',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				],
				journeyTitle: 'Manage Reps',
				layoutTemplate: 'views/layouts/forms-question.njk',
				backLinkUrl: '/cases/123/manage-representations/456/review/task-list/123',
				currentUrl: '/cases/123/manage-representations/456/review/task-list/123/redact',
				errors: { 'upload-form': { msg: 'File with this name already exists on Representation' } },
				errorSummary: [
					{
						text: 'File with this name already exists on Representation',
						href: '#upload-form'
					}
				],
				shouldShowHintText: false
			});
		});
		it('should return not found handler when id req param is null', async () => {
			const mockReq = {
				params: {},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`,
				files: [
					{
						itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
						fileName: 'test-pdf.pdf',
						mimeType: 'application/pdf',
						size: 227787
					}
				]
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockNext = mock.fn();

			const validatedRedactedFile = buildValidateRedactedFileMiddleware({});

			await assert.rejects(() => validatedRedactedFile(mockReq, mockRes, mockNext));
		});
		it('should return not found handler when representationRef req param is null', async () => {
			const mockReq = {
				params: {
					id: '123'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`,
				files: [
					{
						itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
						fileName: 'test-pdf.pdf',
						mimeType: 'application/pdf',
						size: 227787
					}
				]
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockNext = mock.fn();

			const validatedRedactedFile = buildValidateRedactedFileMiddleware({});

			await assert.rejects(() => validatedRedactedFile(mockReq, mockRes, mockNext));
		});
		it('should return not found handler when itemId req param is null', async () => {
			const mockReq = {
				params: {
					id: '123',
					representationRef: '456'
				},
				session: {},
				baseUrl: `/cases/123/manage-representations/456/review`,
				files: [
					{
						itemId: '012D6AZFDCQ6AFNGRA35HJKMBRK34SFXK7',
						fileName: 'test-pdf.pdf',
						mimeType: 'application/pdf',
						size: 227787
					}
				]
			};
			const mockRes = {
				status: mock.fn(),
				render: mock.fn()
			};
			const mockNext = mock.fn();

			const validatedRedactedFile = buildValidateRedactedFileMiddleware({});

			await assert.rejects(() => validatedRedactedFile(mockReq, mockRes, mockNext));
		});
	});
});
