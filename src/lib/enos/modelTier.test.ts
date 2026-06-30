import { describe, expect, test } from 'vitest';

import { enosOrbAssetForModel, enosOrbColorForModel } from './modelTier';

describe('ENOS model tier orb mapping', () => {
	test('maps model tiers to the requested brand tones', () => {
		expect(enosOrbAssetForModel('enos.subconscious')).toBe('/static/enos_loader_orb_orange.svg');
		expect(enosOrbAssetForModel('enos.conscious')).toBe('/static/enos_loader_orb_coral.svg');
		expect(enosOrbAssetForModel('enos.ego')).toBe('/static/enos_loader_orb_teal.svg');
	});

	test('keeps pre-rename ids (mind/deepmind) as aliases so old chats still tint', () => {
		expect(enosOrbAssetForModel('enos.mind')).toBe('/static/enos_loader_orb_coral.svg');
		expect(enosOrbAssetForModel('enos.deepmind')).toBe('/static/enos_loader_orb_teal.svg');
	});

	test('maps Desk tier aliases to the same tones', () => {
		expect(enosOrbAssetForModel('enos.desk.subconscious')).toBe(
			'/static/enos_loader_orb_orange.svg'
		);
		expect(enosOrbAssetForModel('enos.desk.conscious')).toBe('/static/enos_loader_orb_coral.svg');
		expect(enosOrbAssetForModel('enos.desk.ego')).toBe('/static/enos_loader_orb_teal.svg');
	});

	test('uses all-orbs for generic or unknown model loading states', () => {
		expect(enosOrbAssetForModel(null)).toBe('/static/enos_loader_all_orbs.svg');
		expect(enosOrbAssetForModel('unknown-model')).toBe('/static/enos_loader_all_orbs.svg');
	});

	test('maps a mind to its in-progress indicator color', () => {
		expect(enosOrbColorForModel('enos.subconscious')).toBe('#f59e0b');
		expect(enosOrbColorForModel('enos.conscious')).toBe('#f87171');
		expect(enosOrbColorForModel('enos.ego')).toBe('#14b8a6');
		expect(enosOrbColorForModel('enos.desk.ego')).toBe('#14b8a6');
	});

	test('stays neutral (null) for unknown/idle states — no false mind attribution', () => {
		expect(enosOrbColorForModel(null)).toBeNull();
		expect(enosOrbColorForModel('unknown-model')).toBeNull();
	});
});
