import type { Prisma } from '@pins/crowndev-database/src/client/client.ts';

export interface UpdateCaseAnswers {
	s62aStatusId?: string;
	developmentDescription?: string;
	// Add as we develop more parameters to update.
}

/**
 * Class to handle converting data from the view, into something ready for
 * a database transaction.
 */
export class S62aCaseUpdateMapper {
	private answers: UpdateCaseAnswers;

	constructor(answers: UpdateCaseAnswers) {
		this.answers = answers;
	}

	/**
	 * Transforms the partial update payload into a Prisma Update Input.
	 */
	public generateUpdateInput(): Prisma.S62aCaseUpdateInput {
		const input: Prisma.S62aCaseUpdateInput = {};

		this.mapScalars(input);
		this.mapLookups(input);

		return input;
	}

	/**
	 * Handles basic scalar fields, things that are just columns
	 * on the base S62A table.
	 */
	private mapScalars(input: Prisma.S62aCaseUpdateInput): void {
		if (this.answers.developmentDescription !== undefined) {
			input.description = this.answers.developmentDescription;
		}
	}

	/**
	 * Handles fields that are joins onto another table, still basic
	 * not handling things like many-many complex joins.
	 */
	private mapLookups(input: Prisma.S62aCaseUpdateInput): void {
		if (this.answers.s62aStatusId !== undefined) {
			input.S62aStatus = { connect: { id: this.answers.s62aStatusId } };
		}
	}
}
