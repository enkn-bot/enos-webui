/**
 * Desk compact status label formatter.
 * Shows contextual info from enriched descriptions (added by toolStatusLabels.ts)
 * while falling back to normalized generic labels for legacy/non-contextual status.
 */

import { cognitionLabel } from './cognitionVocabulary';

type StatusLike = {
	action?: string;
	description?: string;
	done?: boolean;
	count?: number;
	urls?: unknown[];
	items?: unknown[];
};

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const sentenceCaseToolName = (value: string): string => {
	const words = value
		.replace(/[.…]+$/g, '')
		.replace(/[_-]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (words.length === 0) return '';
	return [words[0][0]?.toUpperCase() + words[0].slice(1), ...words.slice(1)].join(' ');
};

/**
 * Check if a description looks contextual (has more than just a bare tool name).
 * E.g. "Read src/main.ts" → contextual; "Read" → bare; "Searched {{count}} sites" → template, not contextual.
 */
const isContextual = (desc: string): boolean => {
	const words = desc.trim().split(/\s+/);
	if (words.length < 2) return false;
	// Template strings like "Searched {{count}} sites" aren't contextual
	if (desc.includes('{{')) return false;
	return true;
};

export const formatDeskStatusLabel = (status: StatusLike | null | undefined): string => {
	const done = status?.done === true;
	const action = status?.action ?? '';
	const description = clean(status?.description);

	// Reasoning action (new)
	if (action === 'reasoning') {
		return done ? 'Thought' : 'Thinking';
	}

	if (
		action === 'web_search' ||
		action === 'web_search_queries_generated' ||
		action === 'queries_generated'
	) {
		// If the description has context (e.g. "Searching Gemini pricing"), show it
		if (isContextual(description)) {
			return description;
		}
		return done ? 'Checked web' : 'Checking web';
	}

	if (action === 'sources_retrieved') {
		if (status?.count === 0) return 'No sources found';
		if (status?.count === 1) return done ? 'Read 1 source' : 'Reading 1 source';
		if (typeof status?.count === 'number') {
			return done ? `Read ${status.count} sources` : `Reading ${status.count} sources`;
		}
		return done ? 'Read sources' : 'Reading sources';
	}

	if (action === 'enos_desk') {
		// If description already has context (e.g. "Read src/main.ts"), show it directly
		if (isContextual(description)) {
			return description;
		}
		// Legacy bare tool name — normalize through the controlled cognition vocabulary
		// so a raw tool ("edit_file", "git_status") speaks a consistent verb (Edited,
		// Read) with the correct in-progress/done tense, instead of an ad-hoc title-case.
		const rawTool = description.replace(/[.…]+$/g, '');
		if (rawTool === 'web_search') return done ? 'Checked web' : 'Checking web';
		if (rawTool) return cognitionLabel(rawTool, done);
		const readable = sentenceCaseToolName(description);
		if (readable) return readable;
	}

	// Generic fallback: speak the canonical verb for the action rather than a bare
	// "Working"/"Done", so every status reads as a cognition step.
	return description || cognitionLabel(action, done);
};
