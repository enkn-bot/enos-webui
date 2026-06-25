import { describe, expect, test } from 'vitest';

import { composeWelcomeGreeting } from './greeting';

describe('composeWelcomeGreeting', () => {
	test('picks a deterministic morning greeting and inserts the first name before punctuation', () => {
		const greeting = composeWelcomeGreeting(new Date(2026, 5, 19, 8, 30), 'Ernest', () => 0);

		expect(greeting).toBe('Good morning, Ernest.');
	});

	test('adds weekend greetings to the selection pool', () => {
		const greeting = composeWelcomeGreeting(new Date(2026, 5, 20, 13, 0), 'Ernest', () => 0.5);

		expect(greeting).toBe('What should we move forward?');
	});

	test('late-session greeting has ENOS voice, not assistant-cute voice', () => {
		const greeting = composeWelcomeGreeting(new Date(2026, 5, 19, 23, 15), '', () => Number.NaN);

		expect(greeting).toBe('Late session. What needs attention?');
	});

	test('does not ship cutesy or Claude-coded welcome copy', () => {
		const samples = [
			composeWelcomeGreeting(new Date(2026, 5, 19, 23, 15), '', () => 0),
			composeWelcomeGreeting(new Date(2026, 5, 19, 23, 15), '', () => 0.5),
			composeWelcomeGreeting(new Date(2026, 5, 19, 23, 15), 'Ernest', () => 0.99),
			composeWelcomeGreeting(new Date(2026, 5, 19, 9, 0), 'Ernest', () => 0.99)
		].join(' ');

		expect(samples).not.toMatch(/night owl|midnight oil|returns/i);
	});
});
