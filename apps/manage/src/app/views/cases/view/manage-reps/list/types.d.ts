export interface ListRepsViewModel {
	reps: {
		awaitingReview: ListRepViewModel[];
		accepted: ListRepViewModel[];
		rejected: ListRepViewModel[];
	};
}

export interface ListRepViewModel {
	reference: string;
	submittedByFullName: string;
	submittedDate: Date | string;
}
