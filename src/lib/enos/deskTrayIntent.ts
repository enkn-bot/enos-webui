import type { DeskDockTabType } from '$lib/enos/tabDock';

const OPEN_WORDS = /\b(open|show|bring\s+up|pull\s+up|launch|switch\s+to|go\s+to)\b/i;

export const deskTrayIntentFromPrompt = (prompt = ''): DeskDockTabType | null => {
	const text = prompt.trim();
	if (!OPEN_WORDS.test(text)) return null;

	if (/\b(terminal|shell|console)\b/i.test(text)) return 'terminal';
	if (/\b(browser|web|page)\b/i.test(text) && /\b(tab|pane|panel|sidebar|side\s+bar|window)\b/i.test(text)) {
		return 'browser';
	}
	if (/\b(files?|file\s+browser|file\s+tab|project\s+files?)\b/i.test(text)) return 'files';

	return null;
};
