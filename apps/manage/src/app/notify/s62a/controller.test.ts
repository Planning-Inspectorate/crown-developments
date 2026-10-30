import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildS62aNotifyCallbackController, findS62aMissingReference } from './controller.ts';

describe('S62A Notify Callback Controller', () => {
	describe('findS62aMissingReference', () => {
		it('returns null for empty or invalid input', () => {
			assert.strictEqual(findS62aMissingReference(null), null);
			assert.strictEqual(findS62aMissingReference(undefined), null);
			assert.strictEqual(findS62aMissingReference('Some random text with no reference'), null);
		});

		it('extracts an S62A Representation reference', () => {
			const body = 'Your representation 1A2B3-4C5D6 has been received.';
			assert.strictEqual(findS62aMissingReference(body), '1A2B3-4C5D6');
		});

		it('extracts a base S62A Application reference', () => {
			const body = 'Update on application S62A/2026/0000013 for your area.';
			assert.strictEqual(findS62aMissingReference(body), 'S62A/2026/0000013');
		});

		it('extracts an S62A Application reference with /PRE suffix', () => {
			const body = 'Pre-application S62A/2026/0000013/PRE has been logged.';
			assert.strictEqual(findS62aMissingReference(body), 'S62A/2026/0000013/PRE');
		});
	});

	describe('buildS62aNotifyCallbackController', () => {
		let mockReq: any;
		let mockRes: any;
		let mockService: any;
		let notifyEmailDbStorage: any[];

		beforeEach(() => {
			notifyEmailDbStorage = [];

			mockReq = {
				body: { id: 'notify-id-123' }
			};

			mockRes = {
				statusCode: null,
				sendData: null,
				status(code: number) {
					this.statusCode = code;
					return this;
				},
				send(data: any) {
					this.sendData = data;
					return this;
				}
			};

			mockService = {
				logger: {
					info: () => {},
					warn: () => {},
					error: () => {}
				},
				s62aNotifyClient: {
					getNotificationById: async () => ({
						data: {
							id: 'notify-id-123',
							reference: '1A2B3-4C5D6',
							email_address: 'submitter@test.com',
							created_at: '2026-10-30T10:00:00Z',
							status: 'delivered'
						}
					})
				},
				db: {
					s62aRepresentation: {
						findUnique: async () => null
					},
					s62aCase: {
						findUnique: async () => null
					},
					notifyEmail: {
						create: async (payload: any) => {
							notifyEmailDbStorage.push(payload);
							return payload;
						}
					}
				}
			};
		});

		it('returns 400 if notification ID is missing', async () => {
			mockReq.body = {};
			const handler = buildS62aNotifyCallbackController(mockService);

			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.statusCode, 400);
			assert.strictEqual(mockRes.sendData, 'Bad Request: Missing notification ID');
		});

		it('returns 404 if Gov Notify cannot find the notification', async () => {
			mockService.s62aNotifyClient.getNotificationById = async () => ({ data: null });
			const handler = buildS62aNotifyCallbackController(mockService);

			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.statusCode, 404);
			assert.strictEqual(mockRes.sendData, 'Notification not found');
		});

		it('returns 500 if Gov Notify API call throws an error', async () => {
			mockService.s62aNotifyClient.getNotificationById = async () => {
				throw new Error('Network Error');
			};
			const handler = buildS62aNotifyCallbackController(mockService);

			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.statusCode, 500);
			assert.strictEqual(mockRes.sendData, 'Gov Notify API call failed');
		});

		it('links an S62A Representation to a SubmittedByContact and saves to DB', async () => {
			mockService.db.s62aRepresentation.findUnique = async () => ({
				submittedByContactId: 'contact-123',
				SubmittedByContact: { email: 'submitter@test.com' },
				RepresentedContacts: []
			});

			const handler = buildS62aNotifyCallbackController(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.statusCode, 200);
			assert.strictEqual(notifyEmailDbStorage.length, 1);

			const savedData = notifyEmailDbStorage[0].data;
			assert.strictEqual(savedData.notifyId, 'notify-id-123');
			assert.strictEqual(savedData.reference, '1A2B3-4C5D6');
			assert.deepStrictEqual(savedData.Contact, { connect: { id: 'contact-123' } });
		});

		it('links an S62A Application to the LPA and saves to DB', async () => {
			mockService.s62aNotifyClient.getNotificationById = async () => ({
				data: {
					id: 'notify-id-123',
					reference: 'S62A/2026/0000013',
					email_address: 'lpa@council.gov.uk',
					created_at: '2026-10-30T10:00:00Z',
					status: 'delivered'
				}
			});

			mockService.db.s62aCase.findUnique = async () => ({
				Lpa: { id: 'lpa-456', email: 'lpa@council.gov.uk' },
				S62aToApplicants: []
			});

			const handler = buildS62aNotifyCallbackController(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.statusCode, 200);
			assert.strictEqual(notifyEmailDbStorage.length, 1);

			const savedData = notifyEmailDbStorage[0].data;
			assert.strictEqual(savedData.reference, 'S62A/2026/0000013');
			assert.deepStrictEqual(savedData.Lpa, { connect: { id: 'lpa-456' } });
		});

		it('falls back to plain email if reference exists but contact is not found', async () => {
			mockService.s62aNotifyClient.getNotificationById = async () => ({
				data: {
					id: 'notify-id-123',
					reference: 'S62A/2026/0000013',
					email_address: 'random@test.com',
					created_at: '2026-10-30T10:00:00Z',
					status: 'delivered'
				}
			});

			mockService.db.s62aCase.findUnique = async () => ({
				Lpa: { id: 'lpa-456', email: 'lpa@council.gov.uk' },
				S62aToApplicants: []
			});

			const handler = buildS62aNotifyCallbackController(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.statusCode, 200);
			assert.strictEqual(notifyEmailDbStorage.length, 1);

			const savedData = notifyEmailDbStorage[0].data;
			assert.strictEqual(savedData.email, 'random@test.com');
			assert.strictEqual(savedData.Contact, undefined, 'Should not have a Contact connection block');
			assert.strictEqual(savedData.Lpa, undefined, 'Should not have an Lpa connection block');
		});

		it('returns 500 if database creation fails', async () => {
			mockService.db.notifyEmail.create = async () => {
				throw new Error('DB Timeout');
			};

			const handler = buildS62aNotifyCallbackController(mockService);
			await handler(mockReq, mockRes, () => {});

			assert.strictEqual(mockRes.statusCode, 500);
			assert.strictEqual(mockRes.sendData, 'Database operation failed');
		});
	});
});
