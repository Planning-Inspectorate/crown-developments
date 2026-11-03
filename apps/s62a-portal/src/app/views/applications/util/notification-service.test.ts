import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { S62aPortalNotificationService } from './notification-service.ts';
import type { PrismaClient } from '@pins/crowndev-database/src/client/client.ts';
import type { HaveYourSayViewModel } from '@pins/crowndev-lib/forms/representations/types.js';
import type { AuditData } from '@pins/crowndev-lib/govnotify/gov-notify-client.ts';
import type { S62aGovNotifyClient } from '@pins/crowndev-lib/govnotify/s62a/s62a-gov-notify-client.ts';
import type { Logger } from 'pino';

/**
 * Helper to generate a baseline of representation answers
 */
const answers = (overrides: Partial<HaveYourSayViewModel> = {}): HaveYourSayViewModel =>
	({
		submittedForId: 'myself',
		myselfEmail: 'myself@test.com',
		myselfFirstName: 'Alex',
		myselfLastName: 'Smith',
		...overrides
	}) as unknown as HaveYourSayViewModel;

describe('S62aPortalNotificationService', () => {
	let mockLogger: Logger;
	let mockNotifyClient: S62aGovNotifyClient;
	let mockDb: PrismaClient;
	let service: S62aPortalNotificationService;

	const mockAuditData: AuditData[] = [{ id: 'audit-1' } as unknown as AuditData];

	const defaultCase = {
		reference: 'S62A/2026/0001',
		description: 'Proposed solar farm development',
		SiteAddress: {
			addressLine1: '1 High Street',
			townCity: 'Reading',
			postcode: 'RG1 1AA'
		},
		siteEasting: '123456',
		siteNorthing: '654321'
	};

	beforeEach(() => {
		mockLogger = {
			info: mock.fn(),
			warn: mock.fn(),
			error: mock.fn()
		} as unknown as Logger;

		mockNotifyClient = {
			sendRepresentationReceivedToMany: mock.fn(async () => mockAuditData)
		} as unknown as S62aGovNotifyClient;

		mockDb = {
			s62aCase: {
				findUnique: mock.fn(async () => defaultCase)
			}
		} as unknown as PrismaClient;

		service = new S62aPortalNotificationService(mockNotifyClient, mockLogger);
	});

	describe('processAcknowledgementRepresentationReceived', () => {
		it('returns wasSent: false and logs a warning when the notify client is null', async () => {
			const nullClientService = new S62aPortalNotificationService(null, mockLogger);
			const result = await nullClientService.processAcknowledgementRepresentationReceived(
				answers(),
				'REP-123',
				'case-uuid-1',
				mockDb
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, ['S62A Gov Notify is not enabled...']);
			assert.strictEqual((mockDb.s62aCase.findUnique as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs a warning when no recipient email is found for "myself"', async () => {
			const result = await service.processAcknowledgementRepresentationReceived(
				answers({ submittedForId: 'myself', myselfEmail: undefined }),
				'REP-123',
				'case-uuid-1',
				mockDb
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, [
				{ representationReference: 'REP-123' },
				'No recipient email found for representation REP-123'
			]);
			assert.strictEqual((mockDb.s62aCase.findUnique as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs a warning when no recipient email is found for non-myself submissions', async () => {
			const result = await service.processAcknowledgementRepresentationReceived(
				answers({ submittedForId: 'representative', submitterEmail: undefined }),
				'REP-123',
				'case-uuid-1',
				mockDb
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.warn as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.warn as any).mock.calls[0].arguments, [
				{ representationReference: 'REP-123' },
				'No recipient email found for representation REP-123'
			]);
			assert.strictEqual((mockDb.s62aCase.findUnique as any).mock.calls.length, 0);
		});

		it('returns wasSent: false and logs an error when the case cannot be found in the database', async () => {
			mockDb.s62aCase.findUnique = mock.fn(async () => null) as any;

			const result = await service.processAcknowledgementRepresentationReceived(
				answers(),
				'REP-123',
				'missing-case-id',
				mockDb
			);

			assert.strictEqual(result.wasSent, false);
			assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.error as any).mock.calls[0].arguments, [
				{ caseId: 'missing-case-id', representationReference: 'REP-123' },
				'Failed to find case for notification'
			]);
			assert.strictEqual((mockNotifyClient.sendRepresentationReceivedToMany as any).mock.calls.length, 0);
		});

		it('extracts "myself" contact details and dispatches email with formatted address', async () => {
			const formAnswers = answers({
				submittedForId: 'myself',
				myselfEmail: 'myself@test.com',
				myselfFirstName: 'Alex',
				myselfLastName: 'Smith',
				submitterEmail: 'stale-submitter@test.com' // Should be ignored
			});

			const result = await service.processAcknowledgementRepresentationReceived(
				formAnswers,
				'REP-123',
				'case-uuid-1',
				mockDb
			);

			assert.strictEqual(result.wasSent, true);
			assert.deepStrictEqual(result.auditData, mockAuditData);

			assert.strictEqual((mockNotifyClient.sendRepresentationReceivedToMany as any).mock.calls.length, 1);
			const [contacts, representationData] = (mockNotifyClient.sendRepresentationReceivedToMany as any).mock.calls[0]
				.arguments;

			assert.deepStrictEqual(contacts, [
				{
					email: 'myself@test.com',
					firstName: 'Alex',
					lastName: 'Smith'
				}
			]);

			assert.strictEqual(representationData.caseReference, 'S62A/2026/0001');
			assert.strictEqual(representationData.representationReference, 'REP-123');
			assert.strictEqual(representationData.applicationDescription, 'Proposed solar farm development');
			assert.ok(representationData.siteAddress.includes('1 High Street'));
			assert.strictEqual(typeof representationData.representationReceivedDate, 'string');

			assert.strictEqual((mockLogger.info as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.info as any).mock.calls[0].arguments, [
				{ representationReference: 'REP-123' },
				'Acknowledgement representation received email dispatched successfully'
			]);
		});

		it('extracts "submitter" contact details when submitted for someone else', async () => {
			const formAnswers = answers({
				submittedForId: 'another-party',
				myselfEmail: 'stale-myself@test.com', // Should be ignored
				submitterEmail: 'submitter@test.com',
				submitterFirstName: 'Jordan',
				submitterLastName: 'Taylor'
			});

			const result = await service.processAcknowledgementRepresentationReceived(
				formAnswers,
				'REP-456',
				'case-uuid-1',
				mockDb
			);

			assert.strictEqual(result.wasSent, true);

			const [contacts] = (mockNotifyClient.sendRepresentationReceivedToMany as any).mock.calls[0].arguments;
			assert.deepStrictEqual(contacts, [
				{
					email: 'submitter@test.com',
					firstName: 'Jordan',
					lastName: 'Taylor'
				}
			]);
		});

		it('formats easting and northing when SiteAddress is not present', async () => {
			mockDb.s62aCase.findUnique = mock.fn(async () => ({
				...defaultCase,
				SiteAddress: null,
				siteEasting: 500100,
				siteNorthing: 200300
			})) as any;

			const result = await service.processAcknowledgementRepresentationReceived(
				answers(),
				'REP-123',
				'case-uuid-1',
				mockDb
			);

			assert.strictEqual(result.wasSent, true);
			const [, representationData] = (mockNotifyClient.sendRepresentationReceivedToMany as any).mock.calls[0].arguments;

			assert.strictEqual(representationData.siteAddress, 'Easting: 500100, Northing: 200300');
		});

		it('falls back to an empty string when the case description is null or undefined', async () => {
			mockDb.s62aCase.findUnique = mock.fn(async () => ({
				...defaultCase,
				description: null
			})) as any;

			const result = await service.processAcknowledgementRepresentationReceived(
				answers(),
				'REP-123',
				'case-uuid-1',
				mockDb
			);

			assert.strictEqual(result.wasSent, true);
			const [, representationData] = (mockNotifyClient.sendRepresentationReceivedToMany as any).mock.calls[0].arguments;

			assert.strictEqual(representationData.applicationDescription, '');
		});

		it('throws an error and logs it if the notify client fails to send', async () => {
			const error = new Error('Service unavailable');
			mockNotifyClient.sendRepresentationReceivedToMany = mock.fn(() => Promise.reject(error));

			await assert.rejects(
				() => service.processAcknowledgementRepresentationReceived(answers(), 'REP-123', 'case-uuid-1', mockDb),
				(err: Error) => {
					assert.strictEqual(err.message, 'Error encountered during email notification dispatch');
					assert.strictEqual(err.cause, error);
					return true;
				}
			);

			assert.strictEqual((mockLogger.error as any).mock.calls.length, 1);
			assert.deepStrictEqual((mockLogger.error as any).mock.calls[0].arguments, [
				{ error, representationReference: 'REP-123' },
				'Error dispatching representation received email'
			]);
		});
	});
});
