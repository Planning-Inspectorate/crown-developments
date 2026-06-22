import { fakerEN_GB as faker } from '@faker-js/faker';

export type DateField = {
	day: string;
	month: string;
	year: string;
};

export type DateDirection = 'before' | 'after';

export type UkAddress = {
	line1: string;
	line2: string;
	town: string;
	county: string;
	postcode: string;
};

function randomInteger(minimum: number, maximum: number): number {
	return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function randomItem<T>(items: readonly T[]): T {
	if (items.length === 0) {
		throw new Error('Cannot select a random item from an empty array');
	}

	return items[randomInteger(0, items.length - 1)];
}

function parseDateField(date: DateField): Date {
	const day = Number(date.day);
	const month = Number(date.month);
	const year = Number(date.year);

	const parsedDate = new Date(Date.UTC(year, month - 1, day));

	const isInvalidDate =
		!Number.isInteger(day) ||
		!Number.isInteger(month) ||
		!Number.isInteger(year) ||
		parsedDate.getUTCFullYear() !== year ||
		parsedDate.getUTCMonth() !== month - 1 ||
		parsedDate.getUTCDate() !== day;

	if (isInvalidDate) {
		throw new Error(`Invalid date supplied: ${date.day}/${date.month}/${date.year}`);
	}

	return parsedDate;
}

function formatDateField(date: Date): DateField {
	return {
		day: String(date.getUTCDate()).padStart(2, '0'),
		month: String(date.getUTCMonth() + 1).padStart(2, '0'),
		year: String(date.getUTCFullYear())
	};
}

/**
 * Generates realistic text for validation testing:
 * - mostly real words
 * - occasionally inserts safe special-character words
 * - always returns the exact requested length
 * - never ends with a space
 */
export function generateRandomString(length: number): string {
	if (length <= 0) {
		return '';
	}

	const words = [
		'planning',
		'application',
		'case',
		'related',
		'linked',
		'inspector',
		'authority',
		'decision',
		'development',
		'proposal',
		'submission',
		'reference',
		'appeal',
		'environmental',
		'consultation',
		'land',
		'project',
		'review',
		'approval',
		'condition',
		'notice',
		'assessment',
		'committee',
		'public',
		'transport',
		'rights',
		'procedure',
		'policy',
		'evidence',
		'objection',
		'supporting',
		'documentation'
	];

	const specialWords = [
		'case-ref',
		'case_ref',
		'section(2)',
		'phase+1',
		'cost-fees',
		'priority!',
		'policy?',
		'approval:',
		'review,',
		'rights-way',
		'notice250',
		'stage-final'
	];

	const separators = [' ', ' ', ' ', '. '];
	const alphabet = 'abcdefghijklmnopqrstuvwxyz';

	let result = '';

	while (result.length < length) {
		const word = Math.random() < 0.1 ? randomItem(specialWords) : randomItem(words);
		const separator = result.length === 0 ? '' : randomItem(separators);
		const chunk = `${separator}${word}`;
		const remainingLength = length - result.length;

		result += chunk.slice(0, remainingLength);
	}

	if (/\s$/.test(result)) {
		result = `${result.slice(0, -1)}${randomItem(alphabet.split(''))}`;
	}

	if (result.length !== length) {
		throw new Error(`generateRandomString() returned ${result.length} characters instead of ${length}`);
	}

	return result;
}

/**
 * Generates a random valid date within 60 years before or after
 * the current year.
 */
export function generateRandomDate(): DateField {
	const currentYear = new Date().getFullYear();
	const startYear = currentYear - 60;
	const endYear = currentYear + 60;

	const year = randomInteger(startYear, endYear);
	const month = randomInteger(1, 12);
	const daysInMonth = new Date(year, month, 0).getDate();
	const day = randomInteger(1, daysInMonth);

	return {
		day: String(day).padStart(2, '0'),
		month: String(month).padStart(2, '0'),
		year: String(year)
	};
}

/**
 * Generates a random date before or after a reference date.
 *
 * The date will be at least `minimumDays` away from the reference
 * date and no more than `maximumDays` away.
 */
export function generateRandomDateByDayOffset(
	referenceDate: DateField,
	minimumDays: number,
	direction: DateDirection,
	maximumDays = 365
): DateField {
	if (!Number.isInteger(minimumDays) || minimumDays < 0) {
		throw new Error(`minimumDays must be a non-negative whole number. Received: ${minimumDays}`);
	}

	if (!Number.isInteger(maximumDays) || maximumDays < minimumDays) {
		throw new Error(
			`maximumDays must be a whole number greater than or equal to minimumDays. ` +
				`Received minimumDays=${minimumDays}, maximumDays=${maximumDays}`
		);
	}

	const parsedReferenceDate = parseDateField(referenceDate);
	const randomDayOffset = randomInteger(minimumDays, maximumDays);
	const directionMultiplier = direction === 'before' ? -1 : 1;

	const generatedDate = new Date(parsedReferenceDate);

	generatedDate.setUTCDate(generatedDate.getUTCDate() + randomDayOffset * directionMultiplier);

	return formatDateField(generatedDate);
}

/**
 * Generates a realistic UK-style address with optional fields
 * using Faker and weighted probabilities.
 */
export function generateUkAddress(): UkAddress {
	return {
		line1:
			faker.helpers.maybe(() => faker.location.streetAddress(), {
				probability: 0.7
			}) ?? '',
		line2:
			faker.helpers.maybe(() => faker.location.secondaryAddress(), {
				probability: 0.4
			}) ?? '',
		town:
			faker.helpers.maybe(() => faker.location.city(), {
				probability: 0.7
			}) ?? '',
		county:
			faker.helpers.maybe(() => faker.location.county(), {
				probability: 0.6
			}) ?? '',
		postcode:
			faker.helpers.maybe(() => faker.location.zipCode().toUpperCase(), {
				probability: 0.7
			}) ?? ''
	};
}

/**
 * Generates a random phone number:
 * - may return an empty string
 * - plain number
 * - number with a + prefix
 * - number with an area code
 * - number with both a + prefix and area code
 * - maximum total length of 14 characters
 */
export function generatePhoneNumber(): string {
	if (randomInteger(0, 3) === 0) {
		return '';
	}

	const generateDigits = (length: number): string => {
		return Array.from({ length }, () => randomInteger(0, 9)).join('');
	};

	const format = randomItem(['number', 'prefix', 'areaCode', 'prefixAreaCode'] as const);

	if (format === 'number') {
		return generateDigits(randomInteger(6, 9));
	}

	if (format === 'prefix') {
		return `+${generateDigits(randomInteger(6, 9))}`;
	}

	const areaCodeLength = randomItem([2, 3] as const);
	const areaCode = generateDigits(areaCodeLength);

	const fixedCharactersLength =
		format === 'prefixAreaCode'
			? 4 // +, (, ), and space
			: 3; // (, ), and space

	const maximumMainDigitsLength = 14 - fixedCharactersLength - areaCodeLength;
	const mainDigitsLength = randomInteger(6, maximumMainDigitsLength);
	const mainDigits = generateDigits(mainDigitsLength);

	if (format === 'areaCode') {
		return `(${areaCode}) ${mainDigits}`;
	}

	return `+(${areaCode}) ${mainDigits}`;
}

/**
 * Generates a varied email address:
 * - may return an empty string
 * - uses different local-part patterns
 * - uses personal, organisation and government-style domains
 */
export function generateEmail(): string {
	if (randomInteger(0, 6) === 0) {
		return '';
	}

	const firstNames = ['john', 'sarah', 'alex', 'emma', 'chris', 'olivia', 'daniel', 'michael', 'laura'];

	const lastNames = ['smith', 'connor', 'brown', 'taylor', 'wilson', 'clarke', 'evans', 'walker'];

	const prefixes = ['test', 'info', 'contact', 'admin', 'hello', 'support', 'enquiries'];
	const companies = ['solirius', 'test-company', 'planning-inspectorate', 'local-authority'];
	const topLevelDomains = ['.com', '.co.uk', '.org', '.net', '.gov.uk'];
	const separators = ['.', '_', '-', ''];
	const firstName = randomItem(firstNames);
	const lastName = randomItem(lastNames);
	const separator = randomItem(separators);
	const number = randomInteger(1, 9999);

	const localPartGenerators = [
		() => `${firstName}.${lastName}`,
		() => `${firstName}${separator}${lastName}${number}`,
		() => randomItem(prefixes),
		() => `${firstName.charAt(0)}${lastName}`,
		() => `${firstName}${number}`,
		() => `${randomItem(prefixes)}-${randomItem(companies)}`
	];

	const domainGenerators = [
		() => `example${randomItem(topLevelDomains)}`,
		() => `${randomItem(companies)}${randomItem(topLevelDomains)}`,
		() => 'planning-inspectorate.gov.uk',
		() => 'local-authority.gov.uk'
	];

	const localPart = randomItem(localPartGenerators)();
	const domain = randomItem(domainGenerators)();
	const email = `${localPart}@${domain}`;

	return email.slice(0, 250);
}

/**
 * Generates a varied linked or related case reference.
 */
export function generateCaseReference(type: 'related' | 'linked'): string {
	const prefixes =
		type === 'related'
			? ['REL', 'related', 'RELATED', 'case', 'app', 'plan']
			: ['LNK', 'linked', 'LINKED', 'case', 'ref', 'way'];

	const caseTypes = [
		'WAY',
		'way',
		'CPO',
		'cpo',
		'ROW',
		'row',
		'COM',
		'com',
		'DRO',
		'dro',
		'APP',
		'app',
		'ENF',
		'enf',
		'PLAN',
		'plan'
	];

	const separators = ['/', '-', '_', '.', ''];

	const currentYear = new Date().getFullYear();
	const year = String(randomInteger(currentYear - 5, currentYear + 5));

	const suffixLength = randomInteger(3, 8);
	const suffix = randomInteger(10 ** (suffixLength - 1), 10 ** suffixLength - 1);

	const prefix = randomItem(prefixes);
	const caseType = randomItem(caseTypes);
	const separator = randomItem(separators);
	const randomNumber = randomInteger(1000, 9999);

	const formats = [
		`${caseType}${separator}${year}${separator}${suffix}`,
		`${prefix}${separator}${caseType}${separator}${randomNumber}`,
		`${caseType}${separator}${prefix}${separator}${year}${separator}${suffix}`,
		`${prefix}${separator}${caseType}${separator}${year}${separator}${suffix}`,
		`${caseType}${separator}${prefix}${separator}${randomNumber}`
	];

	return randomItem(formats);
}
