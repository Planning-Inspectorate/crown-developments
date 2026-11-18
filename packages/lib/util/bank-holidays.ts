/**
 * England and Wales bank holidays, copied from the GOV.UK bank holidays feed:
 * https://www.gov.uk/bank-holidays.json (division "england-and-wales").
 *
 * GOV.UK adds new years to the feed as they are announced. When the
 * "bank holiday list is up to date" test in working-days.test.ts fails,
 * refresh this list from the feed.
 *
 * Dates are calendar dates in UK time (yyyy-MM-dd).
 */
export const ENGLAND_AND_WALES_BANK_HOLIDAYS: readonly string[] = Object.freeze([
	// 2019
	'2019-01-01', // New Year’s Day
	'2019-04-19', // Good Friday
	'2019-04-22', // Easter Monday
	'2019-05-06', // Early May bank holiday
	'2019-05-27', // Spring bank holiday
	'2019-08-26', // Summer bank holiday
	'2019-12-25', // Christmas Day
	'2019-12-26', // Boxing Day
	// 2020
	'2020-01-01', // New Year’s Day
	'2020-04-10', // Good Friday
	'2020-04-13', // Easter Monday
	'2020-05-08', // Early May bank holiday (VE day)
	'2020-05-25', // Spring bank holiday
	'2020-08-31', // Summer bank holiday
	'2020-12-25', // Christmas Day
	'2020-12-28', // Boxing Day (substitute day)
	// 2021
	'2021-01-01', // New Year’s Day
	'2021-04-02', // Good Friday
	'2021-04-05', // Easter Monday
	'2021-05-03', // Early May bank holiday
	'2021-05-31', // Spring bank holiday
	'2021-08-30', // Summer bank holiday
	'2021-12-27', // Christmas Day (substitute day)
	'2021-12-28', // Boxing Day (substitute day)
	// 2022
	'2022-01-03', // New Year’s Day (substitute day)
	'2022-04-15', // Good Friday
	'2022-04-18', // Easter Monday
	'2022-05-02', // Early May bank holiday
	'2022-06-02', // Spring bank holiday
	'2022-06-03', // Platinum Jubilee bank holiday
	'2022-08-29', // Summer bank holiday
	'2022-09-19', // Bank Holiday for the State Funeral of Queen Elizabeth II
	'2022-12-26', // Boxing Day
	'2022-12-27', // Christmas Day (substitute day)
	// 2023
	'2023-01-02', // New Year’s Day (substitute day)
	'2023-04-07', // Good Friday
	'2023-04-10', // Easter Monday
	'2023-05-01', // Early May bank holiday
	'2023-05-08', // Bank holiday for the coronation of King Charles III
	'2023-05-29', // Spring bank holiday
	'2023-08-28', // Summer bank holiday
	'2023-12-25', // Christmas Day
	'2023-12-26', // Boxing Day
	// 2024
	'2024-01-01', // New Year’s Day
	'2024-03-29', // Good Friday
	'2024-04-01', // Easter Monday
	'2024-05-06', // Early May bank holiday
	'2024-05-27', // Spring bank holiday
	'2024-08-26', // Summer bank holiday
	'2024-12-25', // Christmas Day
	'2024-12-26', // Boxing Day
	// 2025
	'2025-01-01', // New Year’s Day
	'2025-04-18', // Good Friday
	'2025-04-21', // Easter Monday
	'2025-05-05', // Early May bank holiday
	'2025-05-26', // Spring bank holiday
	'2025-08-25', // Summer bank holiday
	'2025-12-25', // Christmas Day
	'2025-12-26', // Boxing Day
	// 2026
	'2026-01-01', // New Year’s Day
	'2026-04-03', // Good Friday
	'2026-04-06', // Easter Monday
	'2026-05-04', // Early May bank holiday
	'2026-05-25', // Spring bank holiday
	'2026-08-31', // Summer bank holiday
	'2026-12-25', // Christmas Day
	'2026-12-28', // Boxing Day (substitute day)
	// 2027
	'2027-01-01', // New Year’s Day
	'2027-03-26', // Good Friday
	'2027-03-29', // Easter Monday
	'2027-05-03', // Early May bank holiday
	'2027-05-31', // Spring bank holiday
	'2027-08-30', // Summer bank holiday
	'2027-12-27', // Christmas Day (substitute day)
	'2027-12-28', // Boxing Day (substitute day)
	// 2028
	'2028-01-03', // New Year’s Day (substitute day)
	'2028-04-14', // Good Friday
	'2028-04-17', // Easter Monday
	'2028-05-01', // Early May bank holiday
	'2028-05-29', // Spring bank holiday
	'2028-08-28', // Summer bank holiday
	'2028-12-25', // Christmas Day
	'2028-12-26' // Boxing Day
]);
