import assert from 'assert';
import { describe, it } from 'node:test';
import {
	REPRESENTATION_CATEGORY_ID,
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID,
	REPRESENTED_TYPE_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { buildS62AWrittenRepresentationsPage } from './controller.ts';
import type { S62APortalService } from '#service';

describe('buildS62AWrittenRepresentationsPage', () => {
	const validUuid = '123e4567-e89b-12d3-a456-426614174000';

	it('should exit early and not query DB if applicationId is an invalid UUID', async (context) => {
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn()
			}
		};
		const service = { db: dbMock } as unknown as S62APortalService;

		const req = {
			params: { applicationId: 'invalid-format-id' },
			originalUrl: '/applications/invalid-format-id/written-representations'
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildS62AWrittenRepresentationsPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 0);
	});

	it('should exit early if the application is not found in the database', async (context) => {
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => null)
			}
		};
		const service = { db: dbMock } as unknown as S62APortalService;

		const req = {
			params: { applicationId: validUuid },
			originalUrl: `/applications/${validUuid}/written-representations`
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildS62AWrittenRepresentationsPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 1);

		const renderCalls = res.render.mock.calls;
		const targetViewCall = renderCalls.find((c: any) => c.arguments[0] === './view.njk');
		assert.strictEqual(targetViewCall, undefined);
	});

	it('should render the written representations template with the correct payload', async (context) => {
		const mockDbCase = {
			id: validUuid,
			reference: 'S62A/2026/0001',
			representationsPublishDate: new Date('2026-01-01'),
			S62aDates: {
				withdrawnDate: null
			}
		};

		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => mockDbCase)
			},
			s62aRepresentation: {
				findMany: context.mock.fn(async () => [
					{
						reference: 'REP-001',
						submittedDate: new Date('2026-01-02'),
						comment: 'A representation',
						commentRedacted: null,
						submittedByAgentOrgName: null,
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.GROUP,
						representedGroupName: null,
						withholdName: false,
						containsAttachments: false,
						distressingContentInRepresentation: false,
						SubmittedFor: { displayName: 'Myself' },
						SubmittedByContact: { firstName: 'Alex', lastName: 'Agent' },
						RepresentedContacts: [
							{ firstName: 'Group', lastName: 'One' },
							{ firstName: 'Group', lastName: 'Two' }
						],
						Category: null,
						Attachments: []
					}
				]),
				count: context.mock.fn(async () => 1)
			}
		};
		const loggerMock = { error: context.mock.fn() };
		const service = { db: dbMock, logger: loggerMock } as unknown as S62APortalService;

		const req = {
			params: { applicationId: validUuid },
			originalUrl: `/applications/${validUuid}/written-representations`,
			query: {
				searchCriteria: 'Alex',
				filterSubmittedBy: [REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES],
				filterByAttachments: ['withAttachments'],
				'submittedDateFrom-day': '1',
				'submittedDateFrom-month': '1',
				'submittedDateFrom-year': '2026',
				'submittedDateTo-day': '2',
				'submittedDateTo-month': '1',
				'submittedDateTo-year': '2026'
			}
		} as any;

		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		const handler = buildS62AWrittenRepresentationsPage(service);
		await handler(req, res, context.mock.fn() as any);

		assert.strictEqual(dbMock.s62aCase.findUnique.mock.callCount(), 1);
		assert.strictEqual(dbMock.s62aRepresentation.count.mock.callCount(), 6);
		const where = dbMock.s62aRepresentation.findMany.mock.calls[0].arguments[0].where;

		assert.deepStrictEqual(where.AND[0].OR[0], {
			representedGroupName: { contains: 'Alex' }
		});

		assert.deepStrictEqual(where.AND[0].OR[1], {
			AND: [
				{ RepresentedContacts: { some: { firstName: { contains: 'Alex' } } } },
				{ OR: [{ withholdName: false }, { withholdName: null }] }
			]
		});

		assert.deepStrictEqual(where.categoryId.in, [REPRESENTATION_CATEGORY_ID.INTERESTED_PARTIES]);
		assert.strictEqual(where.containsAttachments, true);
		assert.deepStrictEqual(where.Attachments, {
			some: { statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
		});
		assert.ok(where.submittedDate.gte instanceof Date);
		assert.ok(where.submittedDate.lte instanceof Date);

		assert.strictEqual(res.render.mock.callCount(), 1);

		const [template, payload] = res.render.mock.calls[0].arguments;

		assert.strictEqual(template, './view.njk');

		assert.strictEqual(payload.pageCaption, 'S62A/2026/0001');
		assert.strictEqual(payload.pageTitle, 'Written representations (comments)');
		assert.strictEqual(payload.applicationReference, 'S62A/2026/0001');
		assert.strictEqual(payload.currentUrl, `/applications/${validUuid}/written-representations`);

		assert.strictEqual(payload.caseFields.id, validUuid);
		assert.strictEqual(payload.caseFields.reference, 'S62A/2026/0001');

		assert.deepStrictEqual(payload.representationMessages, []);
		assert.strictEqual(payload.representations.length, 1);
		assert.ok(payload.links.some((link: { href: string }) => link.href.endsWith('/written-representations')));
	});

	it('should exclude representations without accepted attachments from the with-attachments filter', async (context) => {
		const mockDbCase = {
			id: validUuid,
			reference: 'S62A/2026/0001',
			representationsPublishDate: new Date('2026-01-01'),
			S62aDates: { withdrawnDate: null }
		};
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => mockDbCase)
			},
			s62aRepresentation: {
				findMany: context.mock.fn(async () => []),
				count: context.mock.fn(async () => 0)
			}
		};
		const service = { db: dbMock, logger: { error: context.mock.fn() } } as unknown as S62APortalService;
		const req = {
			params: { applicationId: validUuid },
			query: { filterByAttachments: ['withAttachments'] },
			originalUrl: `/applications/${validUuid}/written-representations`
		} as any;
		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		await buildS62AWrittenRepresentationsPage(service)(req, res, context.mock.fn() as any);

		const where = dbMock.s62aRepresentation.findMany.mock.calls[0].arguments[0].where;
		assert.deepStrictEqual(where.Attachments, {
			some: { statusId: REPRESENTATION_STATUS_ID.ACCEPTED }
		});
	});

	it('should include representations without accepted attachments in the without-attachments filter', async (context) => {
		const mockDbCase = {
			id: validUuid,
			reference: 'S62A/2026/0001',
			representationsPublishDate: new Date('2026-01-01'),
			S62aDates: { withdrawnDate: null }
		};
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => mockDbCase)
			},
			s62aRepresentation: {
				findMany: context.mock.fn(async () => []),
				count: context.mock.fn(async () => 0)
			}
		};
		const service = { db: dbMock, logger: { error: context.mock.fn() } } as unknown as S62APortalService;
		const req = {
			params: { applicationId: validUuid },
			query: { filterByAttachments: ['withoutAttachments'] },
			originalUrl: `/applications/${validUuid}/written-representations`
		} as any;
		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		await buildS62AWrittenRepresentationsPage(service)(req, res, context.mock.fn() as any);

		const where = dbMock.s62aRepresentation.findMany.mock.calls[0].arguments[0].where;
		assert.deepStrictEqual(where.OR, [
			{ containsAttachments: false },
			{ containsAttachments: null },
			{ Attachments: { none: { statusId: REPRESENTATION_STATUS_ID.ACCEPTED } } }
		]);
	});

	it('should hide representation results and pagination until the publish date', async (context) => {
		context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-03-20T10:00:00.000Z') });
		const mockDbCase = {
			id: validUuid,
			reference: 'S62A/2026/0001',
			representationsPeriodStartDate: new Date('2026-02-01T00:00:00.000Z'),
			representationsPeriodEndDate: new Date('2026-03-01T00:00:00.000Z'),
			representationsPublishDate: new Date('2026-04-01T00:00:00.000Z'),
			S62aDates: { withdrawnDate: null }
		};
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => mockDbCase)
			},
			s62aRepresentation: {
				findMany: context.mock.fn(),
				count: context.mock.fn(async () => 60)
			}
		};
		const service = { db: dbMock, logger: { error: context.mock.fn() } } as unknown as S62APortalService;
		const req = {
			params: { applicationId: validUuid },
			query: { searchCriteria: 'example' },
			originalUrl: `/applications/${validUuid}/written-representations`
		} as any;
		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		await buildS62AWrittenRepresentationsPage(service)(req, res, context.mock.fn() as any);

		const [, payload] = res.render.mock.calls[0].arguments;
		assert.strictEqual(dbMock.s62aRepresentation.findMany.mock.callCount(), 0);
		assert.strictEqual(payload.representationsArePublished, false);
		assert.strictEqual(payload.paginationParams.totalItems, 0);
		assert.deepStrictEqual(payload.representationMessages, [
			'No written representations (comments) have been published yet.',
			'You’ll be able to view the published written representations from 01 April 2026'
		]);
	});

	it('should exclude withheld names from search matches and show withheld representations as Interested Party', async (context) => {
		const mockDbCase = {
			id: validUuid,
			reference: 'S62A/2026/0001',
			representationsPublishDate: new Date('2026-01-01'),
			S62aDates: {
				withdrawnDate: null
			}
		};
		const dbMock = {
			s62aCase: {
				findUnique: context.mock.fn(async () => mockDbCase)
			},
			s62aRepresentation: {
				findMany: context.mock.fn(async () => [
					{
						reference: 'REP-001',
						submittedDate: new Date('2026-01-02'),
						comment: 'A representation',
						commentRedacted: null,
						submittedByAgentOrgName: null,
						submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.ON_BEHALF_OF,
						representedTypeId: REPRESENTED_TYPE_ID.GROUP,
						representedGroupName: null,
						withholdName: true,
						containsAttachments: false,
						distressingContentInRepresentation: false,
						SubmittedFor: { displayName: 'Myself' },
						SubmittedByContact: { firstName: 'Alex', lastName: 'Agent' },
						RepresentedContacts: [
							{ firstName: 'Group', lastName: 'One' },
							{ firstName: 'Group', lastName: 'Two' }
						],
						Category: null,
						Attachments: []
					}
				]),
				count: context.mock.fn(async () => 1)
			}
		};
		const service = { db: dbMock, logger: { error: context.mock.fn() } } as unknown as S62APortalService;
		const req = {
			params: { applicationId: validUuid },
			query: { searchCriteria: 'Alex' },
			originalUrl: `/applications/${validUuid}/written-representations`
		} as any;
		const res = {
			status: context.mock.fn(() => res),
			render: context.mock.fn(),
			send: context.mock.fn()
		} as any;

		await buildS62AWrittenRepresentationsPage(service)(req, res, context.mock.fn() as any);

		const findManyWhere = dbMock.s62aRepresentation.findMany.mock.calls[0].arguments[0].where;
		const countWhere = dbMock.s62aRepresentation.count.mock.calls.find((call: any) => !!call.arguments[0].where.AND)
			?.arguments[0].where;
		const searchMatches = findManyWhere.AND[0].OR;
		const notWithheld = { OR: [{ withholdName: false }, { withholdName: null }] };

		const [, payload] = res.render.mock.calls[0].arguments;

		assert.strictEqual(searchMatches.length, 8);

		assert.deepStrictEqual(searchMatches[0], { representedGroupName: { contains: 'Alex' } });

		for (const match of searchMatches.slice(1, 6)) {
			assert.deepStrictEqual(match.AND[1], notWithheld);
		}

		assert.deepStrictEqual(searchMatches[6], { commentRedacted: { contains: 'Alex' } });

		assert.deepStrictEqual(searchMatches[7], {
			AND: [{ comment: { contains: 'Alex' } }, { commentRedacted: { equals: null } }]
		});

		assert.deepStrictEqual(countWhere.AND, findManyWhere.AND);
		assert.strictEqual(payload.representations.length, 1);
		assert.strictEqual(payload.representations[0].representationTitle, 'Interested Party');
	});
});
