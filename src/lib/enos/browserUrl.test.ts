import { describe, expect, test } from 'vitest';

import { normalizeUrl } from './browserUrl';

describe('normalizeUrl', () => {
	test('empty or whitespace returns null', () => {
		expect(normalizeUrl('')).toBeNull();
		expect(normalizeUrl('   ')).toBeNull();
	});

	test('passes through an https url unchanged', () => {
		expect(normalizeUrl('https://example.com/path')).toBe('https://example.com/path');
	});

	test('passes through an http url unchanged', () => {
		expect(normalizeUrl('http://example.com')).toBe('http://example.com');
	});

	test('prefixes https for a bare domain', () => {
		expect(normalizeUrl('example.com')).toBe('https://example.com');
	});

	test('prefixes http for localhost with a port', () => {
		expect(normalizeUrl('localhost:3000')).toBe('http://localhost:3000');
	});

	test('prefixes http for 127.0.0.1', () => {
		expect(normalizeUrl('127.0.0.1:8080/health')).toBe('http://127.0.0.1:8080/health');
	});

	test('trims surrounding whitespace before normalizing', () => {
		expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
	});
});
