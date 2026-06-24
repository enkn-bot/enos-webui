export type EnosOrbTone = 'orange' | 'coral' | 'teal' | 'sage' | 'all';

const MODEL_TONE_BY_ID = new Map<string, EnosOrbTone>([
	['enos.subconscious', 'orange'],
	['enos.desk.subconscious', 'orange'],
	['enos.mind', 'coral'],
	['enos.desk.mind', 'coral'],
	['enos.deepmind', 'teal'],
	['enos.desk.deepmind', 'teal']
]);

const ORB_ASSET_BY_TONE: Record<EnosOrbTone, string> = {
	orange: '/static/enos_loader_orb_orange.svg',
	coral: '/static/enos_loader_orb_coral.svg',
	teal: '/static/enos_loader_orb_teal.svg',
	sage: '/static/enos_loader_orb_sage.svg',
	all: '/static/enos_loader_all_orbs.svg'
};

const enosOrbToneForModel = (modelId: string | null | undefined): EnosOrbTone =>
	MODEL_TONE_BY_ID.get(String(modelId ?? '')) ?? 'all';

export const enosOrbAssetForTone = (tone: EnosOrbTone = 'all'): string =>
	ORB_ASSET_BY_TONE[tone] ?? ORB_ASSET_BY_TONE.all;

export const enosOrbAssetForModel = (modelId: string | null | undefined): string =>
	enosOrbAssetForTone(enosOrbToneForModel(modelId));
