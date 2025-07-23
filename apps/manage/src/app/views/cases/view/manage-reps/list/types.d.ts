export interface ListRepsViewModel {
	reps: ListRepViewModel[];
}

export interface ListRepViewModel {
	reference: string;
	submittedByFullName: string;
	submittedDate: Date | string;
	submittedDateSortableValue: number | string;
	status: string;
	review: boolean;
}
