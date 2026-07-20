import { fakerEN_GB as faker } from '@faker-js/faker';
import { randomInt } from 'node:crypto';

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

export type NameCharacterSet = 'simple' | 'special' | 'mixed';
export type PhoneNumberCharacterSet = 'simple' | 'mixed';

type GenerateNameOptions = {
	characterSet?: NameCharacterSet;
};

type GenerateRandomStringOptions = {
	includeSpecialCharacter?: boolean;
	requiredSpecialWords?: string[];
};

type GenerateEmailOptions = {
	firstName?: string;
	lastName?: string;
	characterSet?: NameCharacterSet;
	allowEmpty?: boolean;
};

type GeneratePhoneNumberOptions = {
	allowEmpty?: boolean;
	characterSet?: PhoneNumberCharacterSet;
};

const SIMPLE_FIRST_NAMES = [
	'Sarah',
	'James',
	'Emily',
	'Michael',
	'Charlotte',
	'Oscar',
	'Daniel',
	'Olivia',
	'Edward',
	'Thomas',
	'Sophie',
	'Grace',
	'Harry',
	'George',
	'Amelia',
	'Isla',
	'Jack',
	'Henry',
	'Freya',
	'Noah',
	'Ella',
	'Ruby',
	'Leo',
	'Arthur',
	'Lily',
	'Mia',
	'Jacob',
	'Samuel',
	'Jessica',
	'Lucy'
] as const;

const SPECIAL_FIRST_NAMES = [
	'José',
	'Chloé',
	'Zoë',
	'Renée',
	'André',
	'Björk',
	'François',
	'Łukasz',
	'Søren',
	'İbrahim',
	'Álvaro',
	'Noémie',
	'Maëlle',
	'Jürgen',
	'Siobhán',
	'Niamh',
	'Óscar',
	'Björn',
	'Åsa',
	'Inês',
	'João',
	'Yūki',
	'Temitọpe',
	'Anne-Marie',
	'Lily-Rose',
	'Mary Jane',
	'Jean-Luc',
	'Billy-Joe',
	'Rose Anne',
	'Mae-Louise',
	'John Paul',
	'María-José',
	'Anna-Lena',
	'Oluwaseun-Ade',
	'D’Arcy',
	"D'Arcy",
	'O’Shea',
	"O'Shea",
	'Tara-Louise',
	'Ella May',
	'Ana María'
] as const;

const SIMPLE_LAST_NAMES = [
	'Thomas',
	'Taylor',
	'Roberts',
	'Evans',
	'Walker',
	'Johnson',
	'Turner',
	'Parker',
	'Phillips',
	'Edwards',
	'Smith',
	'Jones',
	'Williams',
	'Brown',
	'Davies',
	'Wilson',
	'Clarke',
	'Hall',
	'Green',
	'Baker',
	'Wood',
	'Cooper',
	'Hill',
	'Ward',
	'Morris',
	'Moore',
	'King',
	'Allen',
	'Scott',
	'Young'
] as const;

const SPECIAL_LAST_NAMES = [
	'García',
	'Fernández',
	'Muñoz',
	'Grønning',
	'Åström',
	'Dvořák',
	'Kovačić',
	'Łukaszewicz',
	'Brontë',
	'López',
	'François',
	'Björnsdóttir',
	'O’Connor',
	"O'Connor",
	'O’Neill',
	"O'Neill",
	'O’Brien',
	"O'Brien",
	'O’Donnell',
	"O'Donnell",
	'D’Arcy',
	"D'Arcy",
	'D’Angelo',
	"D'Angelo",
	'McCarthy',
	'MacDonald-Smith',
	'Ó Briain',
	'Kowalski',
	'Nowicka',
	'Novák',
	'Horváth',
	'Németh',
	'Öztürk',
	'Yılmaz',
	'Çelik',
	'de la Cruz',
	'Van der Merwe',
	'van den Berg',
	'Gonçalves',
	'Rodríguez',
	'Sánchez',
	'Martínez',
	'Nguyễn',
	'Wójcik',
	'Król',
	'Adébáyọ̀',
	'Saint-Clair',
	'Smith-Jones',
	'Taylor Brown',
	'Parker-James',
	'Lee Wong',
	'Evans-Pritchard',
	'Jones Davies',
	'García Márquez',
	'da Silva',
	'de Souza',
	'Al-Fayed',
	'Al Saud',
	'bin Zayed'
] as const;

const ALL_FIRST_NAMES = [...SIMPLE_FIRST_NAMES, ...SPECIAL_FIRST_NAMES] as const;
const ALL_LAST_NAMES = [...SIMPLE_LAST_NAMES, ...SPECIAL_LAST_NAMES] as const;

const EMAIL_PREFIXES = ['test', 'info', 'contact', 'admin', 'hello', 'support', 'enquiries'] as const;
const EMAIL_COMPANIES = ['solirius', 'test-company', 'planning-inspectorate', 'local-authority'] as const;
const EMAIL_TOP_LEVEL_DOMAINS = ['.com', '.co.uk', '.org', '.net', '.gov.uk'] as const;
const EMAIL_SEPARATORS = ['.', '_', '-', ''] as const;

function randomInteger(minimum: number, maximum: number): number {
	return randomInt(minimum, maximum + 1);
}

function randomItem<T>(items: readonly T[]): T {
	if (items.length === 0) {
		throw new Error('Cannot select a random item from an empty array');
	}

	return items[randomInteger(0, items.length - 1)];
}

function getFirstNamePool(characterSet: NameCharacterSet): readonly string[] {
	if (characterSet === 'special') {
		return SPECIAL_FIRST_NAMES;
	}

	if (characterSet === 'mixed') {
		return ALL_FIRST_NAMES;
	}

	return SIMPLE_FIRST_NAMES;
}

function getLastNamePool(characterSet: NameCharacterSet): readonly string[] {
	if (characterSet === 'special') {
		return SPECIAL_LAST_NAMES;
	}

	if (characterSet === 'mixed') {
		return ALL_LAST_NAMES;
	}

	return SIMPLE_LAST_NAMES;
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

function normaliseEmailPart(value: string): string {
	const normalisedValue = value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9]+/g, '.')
		.replace(/^\.+|\.+$/g, '')
		.toLowerCase();

	return normalisedValue || 'test';
}

/**
 * Generates realistic text for validation testing.
 *
 * By default this only uses safe words, which keeps general tests stable.
 * Use `includeSpecialCharacter` to include one random safe special-character word.
 * Use `requiredSpecialWords` to guarantee specific words are included.
 *
 * The returned string:
 * - always matches the requested length
 * - never starts with a space
 * - never ends with a space
 * - only includes special-character words when explicitly requested
 */
export function generateRandomString(length: number, options: GenerateRandomStringOptions = {}): string {
	if (length <= 0) {
		return '';
	}

	const { includeSpecialCharacter = false, requiredSpecialWords = [] } = options;

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
		'notice-250',
		'stage-final'
	];

	const separators = [' ', ' ', ' ', '. '];
	const alphabet = 'abcdefghijklmnopqrstuvwxyz';

	const requiredWords = [...requiredSpecialWords];

	if (includeSpecialCharacter && requiredWords.length === 0) {
		requiredWords.push(randomItem(specialWords));
	}

	const requiredText = requiredWords.join(' ');

	if (requiredText.length > length) {
		throw new Error(
			`generateRandomString() cannot include required words '${requiredText}' because they are longer than ${length}`
		);
	}

	let result = requiredText;

	while (result.length < length) {
		const word = randomItem(words);
		const separator = result.length === 0 ? '' : randomItem(separators);
		const chunk = `${separator}${word}`;
		const remainingLength = length - result.length;

		result += chunk.slice(0, remainingLength);
	}

	if (/^\s/.test(result)) {
		result = `${randomItem(alphabet.split(''))}${result.slice(1)}`;
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
 * Generates a random first name.
 *
 * Defaults to a simple name with no special characters.
 * Use characterSet: 'special' for accents, hyphens, apostrophes, and spaces.
 * Use characterSet: 'mixed' for either simple or special names.
 */
export function generateRandomFirstName(options: GenerateNameOptions = {}): string {
	const { characterSet = 'simple' } = options;

	return randomItem(getFirstNamePool(characterSet));
}

/**
 * Generates a random last name.
 *
 * Defaults to a simple name with no special characters.
 * Use characterSet: 'special' for accents, hyphens, apostrophes, and spaces.
 * Use characterSet: 'mixed' for either simple or special names.
 */
export function generateRandomLastName(options: GenerateNameOptions = {}): string {
	const { characterSet = 'simple' } = options;

	return randomItem(getLastNamePool(characterSet));
}

/**
 * Generates a varied email address.
 *
 * By default this may return an empty string.
 * Use allowEmpty: false for required email fields.
 *
 * First and last name can be supplied so the email matches
 * generated contact details.
 */
export function generateEmail(options: GenerateEmailOptions = {}): string {
	const { characterSet = 'mixed', allowEmpty = true } = options;

	if (allowEmpty && randomInteger(0, 6) === 0) {
		return '';
	}

	const firstName = options.firstName ?? generateRandomFirstName({ characterSet });
	const lastName = options.lastName ?? generateRandomLastName({ characterSet });

	const emailFirstName = normaliseEmailPart(firstName);
	const emailLastName = normaliseEmailPart(lastName);
	const separator = randomItem(EMAIL_SEPARATORS);
	const number = randomInteger(1, 9999);

	const localPartGenerators = [
		() => `${emailFirstName}.${emailLastName}`,
		() => `${emailFirstName}_${emailLastName}`,
		() => `${emailFirstName}-${emailLastName}`,
		() => `${emailFirstName}${separator}${emailLastName}${number}`,
		() => `${emailFirstName.charAt(0)}${emailLastName}`,
		() => `${emailFirstName}${number}`,
		() => randomItem(EMAIL_PREFIXES),
		() => `${randomItem(EMAIL_PREFIXES)}-${randomItem(EMAIL_COMPANIES)}`
	];

	const domainGenerators = [
		() => `example${randomItem(EMAIL_TOP_LEVEL_DOMAINS)}`,
		() => `${randomItem(EMAIL_COMPANIES)}${randomItem(EMAIL_TOP_LEVEL_DOMAINS)}`,
		() => 'planning-inspectorate.gov.uk',
		() => 'local-authority.gov.uk'
	];

	const localPart = randomItem(localPartGenerators)();
	const domain = randomItem(domainGenerators)();
	const email = `${localPart}@${domain}`;

	return email.slice(0, 250);
}

/**
 * Generates a valid email address.
 *
 * This always returns a non-empty value and is useful for required
 * email address fields.
 *
 * First and last name can be supplied so the email matches
 * generated contact details.
 */
export function generateRandomEmailAddress(
	firstName = generateRandomFirstName(),
	lastName = generateRandomLastName()
): string {
	return generateEmail({
		firstName,
		lastName,
		allowEmpty: false
	});
}

/**
 * Generates a varied phone number.
 *
 * By default this may return an empty string.
 * Use allowEmpty: false for required telephone fields.
 *
 * Use characterSet: 'simple' for digits only.
 * Use characterSet: 'mixed' for +, brackets, spaces, and area codes.
 */
export function generatePhoneNumber(options: GeneratePhoneNumberOptions = {}): string {
	const { allowEmpty = true, characterSet = 'mixed' } = options;

	if (allowEmpty && randomInteger(0, 3) === 0) {
		return '';
	}

	const generateDigits = (length: number): string => {
		let value = '';

		for (let index = 0; index < length; index++) {
			value += randomInteger(0, 9);
		}

		return value;
	};

	if (characterSet === 'simple') {
		return generateDigits(randomInteger(6, 9));
	}

	const format = randomItem(['number', 'prefix', 'areaCode', 'prefixAreaCode'] as const);

	if (format === 'number') {
		return generateDigits(randomInteger(6, 9));
	}

	if (format === 'prefix') {
		return `+${generateDigits(randomInteger(6, 9))}`;
	}

	const areaCodeLength = randomItem([2, 3] as const);
	const areaCode = generateDigits(areaCodeLength);

	const maximumMainDigitsLength =
		format === 'prefixAreaCode' ? 14 - 1 - 1 - areaCodeLength - 1 - 1 : 14 - 1 - areaCodeLength - 1 - 1;

	const mainDigitsLength = randomInteger(6, maximumMainDigitsLength);
	const mainDigits = generateDigits(mainDigitsLength);

	if (format === 'areaCode') {
		return `(${areaCode}) ${mainDigits}`;
	}

	return `+(${areaCode}) ${mainDigits}`;
}

/**
 * Generates a valid telephone number.
 *
 * This always returns a non-empty value and is useful for required
 * telephone number fields.
 *
 * Defaults to a simple digits-only telephone number.
 */
export function generateRandomTelephoneNumber(characterSet: PhoneNumberCharacterSet = 'simple'): string {
	return generatePhoneNumber({
		allowEmpty: false,
		characterSet
	});
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
			faker.helpers.maybe(() => faker.location.zipCode('??# #??').toUpperCase(), {
				probability: 0.7
			}) ?? ''
	};
}
