export type PageValidation = 'basicValidation' | 'fullValidation';

type PageValidationCallback = () => void | Promise<void>;

export async function runPageValidation(
	pageValidation: PageValidation,
	runBasicValidation: PageValidationCallback,
	runFullValidation: PageValidationCallback
): Promise<void> {
	await runBasicValidation();

	if (pageValidation === 'fullValidation') {
		await runFullValidation();
	}
}
