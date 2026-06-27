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

export const enosOrbToneForModel = (modelId: string | null | undefined): EnosOrbTone =>
	MODEL_TONE_BY_ID.get(String(modelId ?? '')) ?? 'all';

// Restrained "who is acting" color: the four logo orb tones as CSS colors, used
// ONLY to tint the live (in-progress) status indicator — never persisted chrome.
// Subconscious=orange, Conscious(mind)=coral, Ego(deepmind)=teal; 'all'/'sage' stay
// neutral so an unknown/idle state shows no mind attribution.
const ORB_COLOR_BY_TONE: Record<EnosOrbTone, string | null> = {
	orange: '#f59e0b',
	coral: '#f87171',
	teal: '#14b8a6',
	sage: null,
	all: null
};

/** CSS color for an in-progress mind indicator, or null when no mind attribution. */
export const enosOrbColorForTone = (tone: EnosOrbTone = 'all'): string | null =>
	ORB_COLOR_BY_TONE[tone] ?? null;

/** CSS color for the active mind by model id, or null (neutral) when unknown. */
export const enosOrbColorForModel = (modelId: string | null | undefined): string | null =>
	enosOrbColorForTone(enosOrbToneForModel(modelId));

export const enosOrbAssetForTone = (tone: EnosOrbTone = 'all'): string =>
	ORB_ASSET_BY_TONE[tone] ?? ORB_ASSET_BY_TONE.all;

export const enosOrbAssetForModel = (modelId: string | null | undefined): string =>
	enosOrbAssetForTone(enosOrbToneForModel(modelId));
