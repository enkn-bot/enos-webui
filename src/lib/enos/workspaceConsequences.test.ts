import { describe, expect, test } from 'vitest';
import { consequenceLines, homeSection } from './workspaceConsequences';

describe('consequenceLines', () => {
	test('local: where files live + privacy + unreachable', () => {
		expect(consequenceLines({ kind: 'local' })).toEqual([
			'Files on this Mac · private to you',
			'Not reachable from the web'
		]);
	});
	test('cloud: always-on + reachable (never capacity/GB)', () => {
		const lines = consequenceLines({ kind: 'cloud' });
		expect(lines).toEqual(['Runs on ENOS’s always-on machine', 'Reachable from any device']);
		expect(lines.join(' ')).not.toMatch(/GB|storage|gigabyte/i);
	});
	test('github: repo name + open-anywhere', () => {
		expect(consequenceLines({ kind: 'github', repo: 'enkn-bot/enos' })).toEqual([
			'Backed by GitHub · enkn-bot/enos',
			'Open it Local or in Cloud'
		]);
	});
	test('null kind: no consequence lines', () => {
		expect(consequenceLines({ kind: null })).toEqual([]);
	});
});

describe('homeSection', () => {
	test('with wired tools: chips + always-on tagline', () => {
		expect(homeSection({ wiredTools: ['GitHub', 'context7'] })).toEqual({
			tools: ['GitHub', 'context7'],
			tagline: 'Always on · context kept'
		});
	});
	test('no wired tools: teach line, no chips (no dead affordance)', () => {
		expect(homeSection({ wiredTools: [] })).toEqual({
			tools: [],
			tagline: 'Connect tools to make this your AI’s home'
		});
	});
	test('never mentions capacity', () => {
		expect(JSON.stringify(homeSection({ wiredTools: [] }))).not.toMatch(/GB|storage/i);
	});
});
