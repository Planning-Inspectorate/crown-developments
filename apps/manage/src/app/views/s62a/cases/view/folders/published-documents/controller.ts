import type { ManageService } from '#service';
import { notFoundHandler } from '@pins/crowndev-lib/middleware/errors.ts';
import type { AsyncRequestHandler } from '@planning-inspectorate/core/util';
import { wrapPrismaError } from '@planning-inspectorate/core/util';
import { getStringParam } from '@pins/crowndev-lib/util/params.ts';
import { createPaginationParams, getPaginationParams } from '@pins/crowndev-lib/views/pagination/pagination-utils.ts';
import { popSessionData } from '@pins/crowndev-lib/util/session.ts';
import { createDocumentsViewModel, type PublishedDocumentWithCategory } from './view-model.ts';
import { PREVIEW_MIME_TYPES } from '../folder/upload/upload-utils.ts';
import { BannerBuilder } from '@pins/crowndev-lib/views/banner/banner-builder.ts';
import { DOCUMENT_CATEGORIES } from '@pins/crowndev-database/src/seed/s62a/data-static.ts';

export function buildViewPublishedDocuments(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res) => {
		const id = getStringParam(req.params, 'id');
		const { pageSize, skipSize } = getPaginationParams(req);

		const now = new Date();

		let caseRow,
			totalDocCount = 0,
			paginatedDocs;

		try {
			const [caseData, paginatedDocuments, totalDocumentCount] = await Promise.all([
				db.s62aCase.findUnique({
					where: { id: id },
					select: { reference: true }
				}),
				db.document.findMany({
					where: {
						s62aCaseId: id,
						deletedAt: null,
						publishDate: { lte: now }
					},
					include: {
						DocumentCategory: true
					},
					skip: skipSize,
					take: pageSize,
					orderBy: { uploadedDate: 'desc' }
				}),
				db.document.count({
					where: {
						s62aCaseId: id,
						deletedAt: null,
						publishDate: { lte: now }
					}
				})
			]);

			caseRow = caseData;
			paginatedDocs = paginatedDocuments;
			totalDocCount = totalDocumentCount || 0;
		} catch (error) {
			wrapPrismaError({ error, logger, message: 'fetching published documents', logParams: {} });
		}

		if (!caseRow || !paginatedDocs) {
			return notFoundHandler(req, res);
		}

		const errorSummary = popSessionData(req, id, 'filesErrors', false, 'folder');

		const filesRecategorised = popSessionData<{ count: number; categoryId: string } | false>(
			req,
			id,
			'filesRecategorised',
			false,
			'folder'
		);

		const filesUnpublished = popSessionData<number | false>(req, id, 'filesUnpublished', false, 'folder');

		const banner = getBannerMessages(filesRecategorised, filesUnpublished, errorSummary);

		const paginationParams = createPaginationParams(req, totalDocCount);
		// We have to cast below because even though publishDate is in the WHERE clause as existing, Prisma thinks it could be null.
		const documentsViewModel = createDocumentsViewModel(
			paginatedDocs as PublishedDocumentWithCategory[],
			PREVIEW_MIME_TYPES
		);

		const baseFoldersUrl = `/s62a/cases/${id}/case-folders`;

		const breadcrumbItems = [
			{ text: 'Manage case files', href: `/s62a/cases/${id}/case-folders` },
			{ text: 'Published documents' }
		];

		return res.render('views/s62a/cases/view/folders/util/shared-folder-view.njk', {
			reference: caseRow.reference,
			folderName: 'Published documents',
			backLinkUrl: baseFoldersUrl,
			baseFoldersUrl: baseFoldersUrl,
			subFolders: [],
			currentUrl: req.originalUrl,
			currentPath: req.originalUrl.split('?')[0],
			breadcrumbItems,
			paginationParams,
			documents: documentsViewModel,
			baseUrl: req.baseUrl,
			errorSummary,
			caseId: id,
			isPublishedView: true,
			banner
		});
	};
}

/**
 * Builds out the various banners we will need on the case details page
 */
function getBannerMessages(
	filesRecategorised: { count: number; categoryId: string } | false,
	filesUnpublished: number | false,
	errorSummary?: { text: string }[] | boolean
) {
	if (errorSummary) {
		return null;
	}

	const bannerBuilder = new BannerBuilder();

	if (filesRecategorised !== false) {
		const count = filesRecategorised.count;
		const category = DOCUMENT_CATEGORIES.find((category) => category.id === filesRecategorised.categoryId)?.displayName;

		bannerBuilder.addSuccessText(`${count} selected ${count === 1 ? 'file' : 'files'} recategorised to ${category}`);
	}

	if (typeof filesUnpublished === 'number') {
		bannerBuilder.addSuccessText(
			`${filesUnpublished} selected ${filesUnpublished === 1 ? 'file' : 'files'} unpublished`
		);
	}

	return bannerBuilder.build();
}
