import { describe, expect, test } from 'vitest';

import { enosOrbAssetForModel, enosOrbToneForModel } from './modelTier';

describe('ENOS model tier orb mapping', () => {
	test('maps model tiers to the requested brand tones', () => {
		expect(enosOrbToneForModel('enos.subconscious')).toBe('orange');
		expect(enosOrbToneForModel('enos.mind')).toBe('coral');
		expect(enosOrbToneForModel('enos.deepmind')).toBe('teal');
	});

	test('maps Desk tier aliases to the same tones', () => {
		expect(enosOrbToneForModel('enos.desk.subconscious')).toBe('orange');
		expect(enosOrbToneForModel('enos.desk.mind')).toBe('coral');
		expect(enosOrbToneForModel('enos.desk.deepmind')).toBe('teal');
	});

	test('uses all-orbs for generic or unknown model loading states', () => {
		expect(enosOrbToneForModel(null)).toBe('all');
		expect(enosOrbAssetForModel('unknown-model')).toBe('/static/enos_loader_all_orbs.svg');
	});
});
