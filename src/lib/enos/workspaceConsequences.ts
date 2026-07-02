import type { WorkspaceKind } from './workspaceBadge';

/**
 * Per-location consequence copy for the environment badge explainer (F3): where
 * files live, what's private, what switching means. Untranslated — caller wraps
 * each line with i18n. NEVER mentions capacity/GB (value = liveness × capability
 * × reach, not storage).
 */
export const consequenceLines = (args: {
	kind: WorkspaceKind | null;
	repo?: string | null;
}): string[] => {
	switch (args.kind) {
		case 'local':
			return ['Files on this Mac · private to you', 'Not reachable from the web'];
		case 'cloud':
			return ['Runs on ENOS’s always-on machine', 'Reachable from any device'];
		case 'github': {
			const repo = String(args.repo ?? '').trim();
			return [
				repo ? `Backed by GitHub · ${repo}` : 'Backed by GitHub',
				'Open it Local or in Cloud'
			];
		}
		default:
			return [];
	}
};

/**
 * The Q7 "Cloud is your AI's home" model, shown in the badge popover when the
 * current location is cloud. Surfaces what's WIRED IN + persistence — never
 * capacity. The caller renders the chips row only when tools.length > 0; with no
 * tools it shows just the teach line (don't light a dead affordance).
 */
export const homeSection = (args: {
	wiredTools: string[];
}): { tools: string[]; tagline: string } => {
	const tools = (args.wiredTools ?? []).filter((t) => String(t ?? '').trim());
	return tools.length > 0
		? { tools, tagline: 'Always on · context kept' }
		: { tools: [], tagline: 'Connect tools to make this your AI’s home' };
};
