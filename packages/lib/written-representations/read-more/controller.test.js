import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
	REPRESENTATION_STATUS_ID,
	REPRESENTATION_SUBMITTED_FOR_ID
} from '@pins/crowndev-database/src/seed/data-static.ts';
import { assertRenders404Page } from '@pins/crowndev-lib/testing/custom-asserts.js';
import { buildWrittenRepresentationsReadMorePage } from './controller.ts';

const applicationId = 'cfe3dc29-1f63-45e6-81dd-da8183842bf8';
const representationReference = 'AAAAA-BBBBB';

function createRequest(id = applicationId) {
	return {
		params: { applicationId: id },
		originalUrl: `/applications/${id}/written-representations/${representationReference}`
	};
}

function createResponse() {
	return {
		render: mock.fn(),
		status: mock.fn()
	};
}

function createRepresentation(overrides = {}) {
	return {
		reference: representationReference,
		submittedDate: new Date('2025-01-15T12:00:00.000Z'),
		comment: 'The original representation.',
		commentRedacted: 'The redacted representation.',
		submittedForId: REPRESENTATION_SUBMITTED_FOR_ID.MYSELF,
		representedTypeId: null,
		submittedByAgentOrgName: null,
		containsAttachments: true,
		distressingContentInRepresentation: false,
		SubmittedByContact: { firstName: 'Alex', lastName: 'Example' },
		RepresentedContact: null,
		Category: { displayName: 'General representation' },
		Attachments: [{ statusId: REPRESENTATION_STATUS_ID.ACCEPTED }],
		...overrides
	};
}

function createDevelopment(overrides = {}) {
	return {
		reference: 'CROWN/2025/0000001',
		representationsPeriodStartDate: null,
		representationsPeriodEndDate: null,
		representationsPublishDate: null,
		...overrides
	};
}

describe('buildWrittenRepresentationsReadMorePage', () => {
	it('renders the shared read-more view with its representation and documents', async () => {
		const request = createRequest();
		const response = createResponse();
		const documents = [{ id: 'document-1', name: 'evidence.pdf', type: 'PDF', size: '12 KB' }];
		const handler = buildWrittenRepresentationsReadMorePage(
			createDevelopment(),
			createRepresentation(),
			representationReference,
			false,
			documents
		);

		await handler(request, response);

		assert.strictEqual(response.render.mock.callCount(), 1);
		const [template, viewModel] = response.render.mock.calls[0].arguments;
		assert.strictEqual(template, 'read-more/view.njk');
		assert.strictEqual(viewModel.pageCaption, 'CROWN/2025/0000001');
		assert.strictEqual(viewModel.currentUrl, `/applications/${applicationId}/written-representations`);
		assert.strictEqual(viewModel.backLinkText, 'Back to list');
		assert.strictEqual(viewModel.backLinkUrl, `/applications/${applicationId}/written-representations`);
		assert.deepStrictEqual(viewModel.representationViewModel, {
			dateRepresentationSubmitted: '15 January 2025',
			representationCategory: 'General representation',
			representationComment: 'The redacted representation.',
			representationCommentIsRedacted: true,
			representationReference,
			representationTitle: 'Alex Example',
			hasAcceptedAttachments: true,
			distressingContent: false
		});
		assert.strictEqual(viewModel.documents, documents);
		assert.strictEqual(viewModel.containsDistressingContent, false);
		assert.deepStrictEqual(
			viewModel.links.map(({ href }) => href),
			[`/applications/${applicationId}/application-information`, `/applications/${applicationId}/documents`]
		);
	});

	it('passes the application-updates option through to the navigation links', async () => {
		const response = createResponse();
		const handler = buildWrittenRepresentationsReadMorePage(
			createDevelopment(),
			createRepresentation(),
			representationReference,
			true
		);

		await handler(createRequest(), response);

		const [, viewModel] = response.render.mock.calls[0].arguments;
		assert.ok(viewModel.links.some(({ href }) => href === `/applications/${applicationId}/application-updates`));
	});

	it('defaults the application distressing-content banner to false', async () => {
		const response = createResponse();
		const handler = buildWrittenRepresentationsReadMorePage(
			createDevelopment({ containsDistressingContent: null }),
			createRepresentation(),
			representationReference,
			false
		);

		await handler(createRequest(), response);

		const [, viewModel] = response.render.mock.calls[0].arguments;
		assert.strictEqual(viewModel.containsDistressingContent, false);
	});

	it('shows the application distressing-content banner when enabled', async () => {
		const response = createResponse();
		const handler = buildWrittenRepresentationsReadMorePage(
			createDevelopment({ containsDistressingContent: true }),
			createRepresentation(),
			representationReference,
			false
		);

		await handler(createRequest(), response);

		const [, viewModel] = response.render.mock.calls[0].arguments;
		assert.strictEqual(viewModel.containsDistressingContent, true);
	});

	it('renders a not-found page when the application ID is invalid', async () => {
		const request = createRequest('invalid-id');
		const handler = buildWrittenRepresentationsReadMorePage(
			createDevelopment(),
			createRepresentation(),
			representationReference,
			false
		);

		await assertRenders404Page(handler, request, false);
	});

	it('rejects a missing application ID', async () => {
		const handler = buildWrittenRepresentationsReadMorePage(
			createDevelopment(),
			createRepresentation(),
			representationReference,
			false
		);

		assert.throws(() => handler({ params: {} }, createResponse()), {
			message: 'applicationId must be a single string value'
		});
	});
});
