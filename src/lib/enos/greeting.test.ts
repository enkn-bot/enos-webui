import { describe, expect, test } from 'vitest';

import { composeWelcomeGreeting } from './greeting';

describe('composeWelcomeGreeting', () => {
	test('picks a deterministic morning greeting and inserts the first name before punctuation', () => {
		const greeting = composeWelcomeGreeting(new Date(2026, 5, 19, 8, 30), 'Ernest', () => 0);

		expect(greeting).toBe('Good morning, Ernest.');
	});

	test('adds weekend greetings to the selection pool', () => {
		const greeting = composeWelcomeGreeting(new Date(2026, 5, 20, 13, 0), 'Ernest', () => 0.5);

		expect(greeting).toBe('Happy Saturday, Ernest!');
	});

	test('handles invalid random values without flickering out of range', () => {
		const greeting = composeWelcomeGreeting(new Date(2026, 5, 19, 23, 15), '', () => Number.NaN);

		expect(greeting).toBe('Hello, night owl.');
	});
});
