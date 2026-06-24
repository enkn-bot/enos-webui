import { describe, expect, test } from 'vitest';

import { enosOrbAssetForModel } from './modelTier';

describe('ENOS model tier orb mapping', () => {
	test('maps model tiers to the requested brand tones', () => {
		expect(enosOrbAssetForModel('enos.subconscious')).toBe('/static/enos_loader_orb_orange.svg');
		expect(enosOrbAssetForModel('enos.mind')).toBe('/static/enos_loader_orb_coral.svg');
		expect(enosOrbAssetForModel('enos.deepmind')).toBe('/static/enos_loader_orb_teal.svg');
	});

	test('maps Desk tier aliases to the same tones', () => {
		expect(enosOrbAssetForModel('enos.desk.subconscious')).toBe(
			'/static/enos_loader_orb_orange.svg'
		);
		expect(enosOrbAssetForModel('enos.desk.mind')).toBe('/static/enos_loader_orb_coral.svg');
		expect(enosOrbAssetForModel('enos.desk.deepmind')).toBe('/static/enos_loader_orb_teal.svg');
	});

	test('uses all-orbs for generic or unknown model loading states', () => {
		expect(enosOrbAssetForModel(null)).toBe('/static/enos_loader_all_orbs.svg');
		expect(enosOrbAssetForModel('unknown-model')).toBe('/static/enos_loader_all_orbs.svg');
	});
});
