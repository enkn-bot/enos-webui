/**
 * Controlled cognition vocabulary — the single source of human verb text and
 * persistence class for ENOS status narration.
 *
 * This is NOT a new narration system: it is a lookup table that the EXISTING
 * statusHistory path uses (deskStatus.ts for Desk, StatusItem.svelte for Chat).
 * The status schema is unchanged ({ action, description, done, urls }); this only
 * normalizes how an `action` is spoken (present while in progress, past once done)
 * and whether a finished step is a meaningful OUTCOME (persist) or TRANSIENT noise
 * (collapse once the answer is present).
 *
 *   action 'searching', done false -> "Searching"   (transient until it has results)
 *   action 'searching', done true  -> "Searched"
 *   action 'thinking',  done true  -> "Thought"     (transient: drop when answered)
 */

export type PersistenceClass = 'transient' | 'outcome';

type Verb = { present: string; past: string; persist: PersistenceClass };

// Canonical cognition verbs. Keys are normalized action tokens; the raw OWUI/Pi
// `action` (e.g. 'web_search', 'sources_retrieved', 'enos_desk') is mapped to one
// of these by `normalizeAction` below so the table stays small and stable.
const VERBS: Record<string, Verb> = {
	thinking: { present: 'Thinking', past: 'Thought', persist: 'transient' },
	planning: { present: 'Planning', past: 'Planned', persist: 'transient' },
	searching: { present: 'Searching', past: 'Searched', persist: 'outcome' },
	reading: { present: 'Reading', past: 'Read', persist: 'outcome' },
	writing: { present: 'Writing', past: 'Wrote', persist: 'outcome' },
	editing: { present: 'Editing', past: 'Edited', persist: 'outcome' },
	executing: { present: 'Running', past: 'Ran', persist: 'outcome' },
	comparing: { present: 'Comparing', past: 'Compared', persist: 'outcome' },
	testing: { present: 'Testing', past: 'Tested', persist: 'outcome' },
	analyzing: { present: 'Analyzing', past: 'Analyzed', persist: 'outcome' },
	summarizing: { present: 'Summarizing', past: 'Summarized', persist: 'outcome' },
	generating: { present: 'Generating', past: 'Generated', persist: 'outcome' },
	verifying: { present: 'Verifying', past: 'Verified', persist: 'outcome' },
	preparing: { present: 'Preparing', past: 'Prepared', persist: 'transient' },
	composing: { present: 'Composing', past: 'Composed', persist: 'transient' },
	responding: { present: 'Responding', past: 'Responded', persist: 'transient' },
	working: { present: 'Working', past: 'Done', persist: 'transient' }
};

// Raw status `action` (OWUI + Pi) -> canonical verb key. Anything unmapped falls
// back to a heuristic in `normalizeAction`, then to 'working'.
const ACTION_ALIASES: Record<string, string> = {
	thinking: 'thinking',
	web_search: 'searching',
	web_search_queries_generated: 'searching',
	queries_generated: 'searching',
	knowledge_search: 'searching',
	sources_retrieved: 'reading',
	reasoning: 'thinking',
	read: 'reading',
	read_file: 'reading',
	list: 'reading',
	ls: 'reading',
	write: 'writing',
	write_file: 'writing',
	edit: 'editing',
	edit_file: 'editing',
	patch: 'editing',
	bash: 'executing',
	run: 'executing',
	execute: 'executing',
	code_interpreter: 'executing',
	test: 'testing',
	// Git operations
	git_status: 'reading',
	git_log: 'reading',
	git_diff: 'reading',
	git_blame: 'reading',
	git_commit: 'writing',
	git_push: 'executing',
	git_pull: 'executing',
	// File operations
	create_file: 'writing',
	move_file: 'editing',
	delete_file: 'editing',
	copy_file: 'reading',
	// Misc Pi tools
	glob: 'reading',
	grep: 'reading',
	find: 'reading'
};

/** Map a raw status action token to a canonical cognition verb key. */
export const normalizeAction = (action: string | null | undefined): keyof typeof VERBS => {
	const raw = String(action ?? '').trim().toLowerCase();
	if (raw in ACTION_ALIASES) return ACTION_ALIASES[raw] as keyof typeof VERBS;
	if (raw in VERBS) return raw as keyof typeof VERBS;
	// Heuristic for unmapped tool actions (e.g. 'git_status', 'rename').
	if (/(search|find|grep)/.test(raw)) return 'searching';
	if (/(read|list|cat|open|status|log|diff)/.test(raw)) return 'reading';
	if (/(write|create|mkdir)/.test(raw)) return 'writing';
	if (/(edit|patch|rename|move|modify)/.test(raw)) return 'editing';
	if (/(run|exec|bash|build|install)/.test(raw)) return 'executing';
	if (/test/.test(raw)) return 'testing';
	return 'working';
};

/** Human verb text for a status: present tense while in progress, past once done. */
export const cognitionLabel = (action: string | null | undefined, done: boolean): string => {
	const verb = VERBS[normalizeAction(action)];
	return done ? verb.past : verb.present;
};

/** Whether a finished step is a meaningful outcome (persist) or transient (collapse). */
export const persistenceClass = (action: string | null | undefined): PersistenceClass =>
	VERBS[normalizeAction(action)].persist;

/**
 * Persistence rule: should this status stay as the collapsed/anchor label once the
 * message is answered? Transient states (thinking/planning/composing/responding)
 * should disappear when the answer is present; outcomes (searched/read/ran/…) stay.
 * A status carrying its own evidence payload (urls/count) is always an outcome.
 */
export type StatusEntry = {
	action?: string | null;
	done?: boolean;
	urls?: unknown[];
	count?: number;
	hidden?: boolean;
};

export const shouldPersistStatus = (
	status: StatusEntry | null | undefined,
	answerPresent: boolean
): boolean => {
	if (!status) return false;
	const hasEvidence =
		(Array.isArray(status.urls) && status.urls.length > 0) ||
		(typeof status.count === 'number' && status.count > 0);
	if (hasEvidence) return true;
	if (!answerPresent) return true; // nothing to replace it yet — keep the live state
	return persistenceClass(status.action) === 'outcome';
};

/**
 * Pick the status shown as the collapsed header.
 * - While the answer is still streaming: the latest (live) status — current behavior.
 * - Once the answer is present: the LAST meaningful outcome (searched/read/ran/…), so a
 *   trailing transient state ("Done"/"Composing") never lingers as the persistent label.
 *   If the turn had no outcome worth keeping (a plain answer), returns null → the caller
 *   renders nothing (no leftover "Done" strip on a simple reply).
 */
/**
 * In a sequential narration feed, only the TAIL step can still be in progress.
 * A step is settled (finished) when:
 *   - the whole turn is answered (`answerPresent`) — nothing is in progress; or
 *   - the step is explicitly `done`; or
 *   - a later step exists (this one was superseded, so it has finished).
 *
 * This is the single rule both surfaces share (Chat timeline + Desk feed). It
 * exists because the backend does not reliably flip `done=true` on superseded
 * entries — the dead-air fix explicitly skips `web_search` — so a stale step would
 * otherwise shimmer in present tense forever ("Checking web" after the answer).
 */
export const isStepSettled = (
	item: { done?: boolean } | null | undefined,
	index: number,
	total: number,
	answerPresent: boolean
): boolean => {
	if (answerPresent) return true;
	if (item?.done === true) return true;
	return index < total - 1;
};

export const selectDisplayStatus = (
	history: StatusEntry[] | null | undefined,
	answerPresent: boolean
): StatusEntry | null => {
	const list = Array.isArray(history) ? history : [];
	if (list.length === 0) return null;
	if (!answerPresent) return list[list.length - 1] ?? null;
	for (let i = list.length - 1; i >= 0; i--) {
		if (shouldPersistStatus(list[i], true)) return list[i];
	}
	return null;
};
