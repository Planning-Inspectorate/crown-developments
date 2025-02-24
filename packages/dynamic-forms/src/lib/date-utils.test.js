import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
	dateIsAfterToday,
	dateIsBeforeToday,
	dateIsToday,
	formatDateForDisplay,
	parseDateInput
} from './date-utils.js';

describe('format-date', () => {
	mock.timers.enable({ apis: ['Date'], now: new Date('2025-01-01T12:00:00') });
	describe('formatUTCDateToUK', () => {
		const tests = [
			{ date: new Date('2024-02-20T15:00Z'), expected: '20 Feb 2024 - 15 00' },
			{ date: new Date('2024-09-30T20:00Z'), expected: '30 Sep 2024 - 21 00' },
			{ date: new Date('2024-09-30T23:59Z'), expected: '1 Oct 2024 - 00 59' },
			{ date: '2024-02-20T15:00:00.000Z', expected: '20 Feb 2024 - 15 00' },
			{ date: '2024-09-30T20:00:00.000Z', expected: '30 Sep 2024 - 21 00' },
			{ date: '2024-09-30T23:59:00.000Z', expected: '1 Oct 2024 - 00 59' }
		];

		for (const { date, expected } of tests) {
			it(`formats ${date} in Europe/London`, () => {
				const got = formatDateForDisplay(date, { format: 'd MMM yyyy - HH mm' });
				assert.strictEqual(got, expected);
			});
		}

		const badInputTests = [
			{ date: undefined, expected: '' },
			{ date: null, expected: '' },
			{ date: 'nope', expected: '' }
		];

		for (const { date, expected } of badInputTests) {
			it(`returns empty string for bad value: ${date}`, () => {
				const got = formatDateForDisplay(date);
				assert.strictEqual(got, expected);
			});
		}
	});

	describe('parseDateInput', () => {
		const tests = [
			{ input: { year: 2024, month: 2, day: 20 }, expected: new Date('2024-02-20T00:00:00.000Z') },
			{
				input: { year: 2024, month: 9, day: 30, hour: 21, minute: 0 },
				expected: new Date('2024-09-30T20:00:00.000Z')
			},
			{
				input: { year: 2024, month: 10, day: 1, hour: 0, minute: 59 },
				expected: new Date('2024-09-30T23:59:00.000Z')
			}
		];

		for (const { input, expected } of tests) {
			it(`parses date ${JSON.stringify(input)} in Europe/London`, () => {
				const got = parseDateInput(input);
				assert.deepStrictEqual(got, expected);
			});
		}
	});
	describe('dateIsAfterToday', () => {
		const tests = [
			{
				input: new Date('2025-01-02T15:00Z'),
				expected: true
			},
			{
				input: new Date('2020-02-20T15:00Z'),
				expected: false
			}
		];
		for (const { input, expected } of tests) {
			it(`${JSON.stringify(input)} ${expected ? 'is' : "isn't"} in the future`, () => {
				const got = dateIsAfterToday(input);
				assert.deepStrictEqual(got, expected);
			});
		}
	});
	describe('dateIsBeforeToday', () => {
		const tests = [
			{
				input: new Date('2090-02-20T15:00Z'),
				expected: false
			},
			{
				input: new Date('2020-02-20T15:00Z'),
				expected: true
			}
		];
		for (const { input, expected } of tests) {
			it(`${JSON.stringify(input)} ${expected ? 'is' : "isn't"} in the past`, () => {
				const got = dateIsBeforeToday(input);
				assert.deepStrictEqual(got, expected);
			});
		}
	});
	describe('dateIsToday', () => {
		const tests = [
			{
				input: new Date('2025-01-02T15:00Z'),
				expected: false
			},
			{
				input: new Date('2020-02-20T15:00Z'),
				expected: false
			},
			{
				input: new Date('2025-01-01T15:00:00'),
				expected: true
			},
			{
				input: new Date('2025-01-01T00:00:00'),
				expected: true
			},
			{
				input: new Date('2025-01-01T23:59:00'),
				expected: true
			}
		];
		for (const { input, expected } of tests) {
			it(`${JSON.stringify(input)} ${expected ? 'is' : "isn't"} today`, () => {
				const got = dateIsToday(input);
				assert.deepStrictEqual(got, expected);
			});
		}
	});
});
