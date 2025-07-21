export interface ListRepsViewModel {
	reps: ListRepViewModel[];
}

export interface ListRepViewModel {
	reference: string;
	submittedByFullName: string;
	submittedDate: Date | string;
	status: string;
	review: boolean;
}
