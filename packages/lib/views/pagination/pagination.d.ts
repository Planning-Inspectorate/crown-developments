//Creates shared type for portal applications
export type PaginationParams = {
	selectedItemsPerPage: number;
	pageNumber: number;
	totalPages: number;
	resultsStartNumber: number;
	resultsEndNumber: number;
	totalItems: number;
};
