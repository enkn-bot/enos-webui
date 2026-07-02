<script>
	import { getContext } from 'svelte';
	const i18n = getContext('i18n');

	import StatusItem from './StatusHistory/StatusItem.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import equal from 'fast-deep-equal';
	import { enosOrbColorForModel } from '$lib/enos/modelTier';
	import {
		selectDisplayStatus,
		normalizeAction,
		isStepSettled
	} from '$lib/enos/cognitionVocabulary';
	import { formatDeskStatusLabel } from '$lib/enos/deskStatus';
	export let statusHistory = [];
	export let expand = false;
	export let compactDesk = false;
	export let modelId = null;
	export let answerPresent = false;
	// Chat surface only: the model's chain-of-thought, lifted out of the message
	// body by ResponseMessage so it nests INSIDE this one status tray instead of
	// rendering its own competing "Ensure direct answer." header. '' on Desk.
	export let reasoningText = '';

	let showHistory = true;
	let showReasoning = false;

	$: hasReasoning = !!(reasoningText && reasoningText.trim());

	// Restrained "who is acting" color: tint ONLY the live (in-progress) indicator dot
	// to the active mind's orb tone (Subconscious/Conscious/Ego). Null for unknown/idle
	// → neutral, no false attribution. Never applied to the persisted/expanded trail.
	// Latch the model id: message.model can be momentarily null early in a turn, which
	// would make the dot flicker off mid-stream. Once a real id is seen, keep it (a
	// message's mind doesn't change), so the dot is stable across the turn.
	let resolvedModelId = null;
	$: if (modelId) {
		resolvedModelId = modelId;
	}
	$: mindColor = enosOrbColorForModel(resolvedModelId);

	$: if (expand) {
		showHistory = true;
	} else {
		showHistory = false;
	}

	let history = [];
	let status = null;

	const THINKING_ACTIONS = new Set(['thinking', 'reasoning']);

	// Persistence rule: while streaming, show the latest live status; once the answer is
	// present, collapse to the last MEANINGFUL outcome and drop a trailing transient
	// ("Done"/"Composing") — a plain answer with no outcome shows nothing.
	// Extra: once a thinking/reasoning step has done=true, suppress the strip immediately —
	// the reasoning collapsible block already shows "Thought for Xs" and we must not
	// duplicate it. We can't wait for answerPresent here because reasoning finishes
	// before the answer text starts streaming (that gap is exactly the double display).
	$: if (history && history.length > 0) {
		const raw = selectDisplayStatus(history, answerPresent);
		const isFinishedThinking =
			raw != null && THINKING_ACTIONS.has(raw?.action ?? '') && raw?.done === true;
		status = isFinishedThinking ? null : raw;
	} else {
		status = null;
	}

	$: if (!equal(statusHistory, history)) {
		history = statusHistory;
	}

	// Collapse consecutive entries with the same normalized action into one (keep last).
	// Handles: thinking ticks ("Thinking… 1s/3s/…"), repeated "Done" pipeline events,
	// and any other same-verb repetition the backend emits between meaningful steps.
	$: displayHistory = (() => {
		const out = [];
		for (let i = 0; i < history.length; i++) {
			const currentNorm = normalizeAction(history[i]?.action);
			const nextNorm = normalizeAction(history[i + 1]?.action);
			if (currentNorm === nextNorm) continue;
			out.push(history[i]);
		}
		return out;
	})();

	// A step is only worth a feed row if StatusItem will actually render text for it.
	// StatusItem renders nothing for hidden steps and for the suppressed
	// "No search query generated" status (ENOS runs web-search query-gen every turn;
	// a non-search answer yields that empty step). Without this filter the feed still
	// drew a leading DOT for those invisible rows — the stray "older system" dot on
	// loose Desk chats. Filtering here is the single source for both surfaces' feeds.
	//
	// Reasoning/thinking is OWNED by the `<details type="reasoning">` collapsible (it
	// shows the same gist + expands to the full text). Keeping it in the feed too made
	// the gist sentence render TWICE — the duplicate line that broke the premium feel.
	// So reasoning is excluded from the feed everywhere; the collapsible is its home.
	const isRenderableStep = (item) =>
		!item?.hidden &&
		item?.description !== 'No search query generated' &&
		!THINKING_ACTIONS.has(normalizeAction(item?.action ?? ''));
	$: feedHistory = displayHistory.filter(isRenderableStep);

	// Effective settle state per step. In a sequential feed only the tail can be in
	// progress; once the turn is answered nothing is. `isStepSettled` is the single
	// surface-agnostic rule (see cognitionVocabulary) so a step whose backend `done`
	// was never flipped (web_search) cannot shimmer in present tense forever.
	$: stepSettled = feedHistory.map((item, idx) =>
		isStepSettled(item, idx, feedHistory.length, answerPresent)
	);
	// The collapsed Chat header reflects the same rule: settled once answered or its
	// own outcome is done, so the header never lingers shimmering after the turn.
	$: headerDone = answerPresent || status?.done === true;
</script>

{#if (history && history.length > 0 && status) || hasReasoning}
	{#if status?.hidden !== true || hasReasoning}
		{#if compactDesk}
			{#if !answerPresent}
				<!-- Desk, live: always-visible operational feed WHILE the turn streams, so a
			     coding sequence (Read → Edited → Ran) shows progress as it happens. -->
				<div class="text-sm flex flex-col w-full">
					{#each feedHistory as historyItem, idx}
						{@const isLast = idx === feedHistory.length - 1}
						{@const settled = stepSettled[idx]}
						{@const isActiveDot = !settled && !!mindColor}
						<div class="flex items-stretch gap-2">
							<div class=" ">
								<div class="pt-2 px-1 mb-1">
									<span class="relative flex size-1.5 rounded-full justify-center items-center">
										<span
											class="relative inline-flex size-1.5 rounded-full {isActiveDot
												? 'enos-mind-dot'
												: 'bg-gray-400 dark:bg-gray-600'}"
											style={isActiveDot ? `background-color: ${mindColor}` : ''}
										></span>
									</span>
								</div>
								{#if !isLast}
									<div
										class="w-[0.5px] ml-[6.5px] h-[calc(100%-12px)] bg-gray-200 dark:bg-gray-800"
									></div>
								{/if}
							</div>

							<StatusItem status={historyItem} done={settled} {compactDesk} />
						</div>
					{/each}
				</div>
			{:else if feedHistory.length > 0}
				<!-- Desk, settled: collapse to ONE clean header (matches the reasoning gist
				     collapsible) — expandable to the full sequence. A finished turn no longer
				     shows the always-visible dots, which read as an unfinished, older UI. -->
				<div class="text-sm flex flex-col w-full">
					<button
						class="w-full flex items-center gap-1.5 text-left text-gray-500 dark:text-gray-500"
						aria-expanded={showHistory}
						aria-label={$i18n.t('Toggle status history')}
						on:click={() => (showHistory = !showHistory)}
					>
						<span class="text-base line-clamp-1">{formatDeskStatusLabel(status, true)}</span>
						{#if feedHistory.length > 1}
							<ChevronDown
								className="size-3.5 shrink-0 text-gray-400 dark:text-gray-600 transition-transform {showHistory
									? 'rotate-180'
									: ''}"
								strokeWidth="2.5"
							/>
						{/if}
					</button>
					{#if showHistory && feedHistory.length > 1}
						<div class="mt-1">
							{#each feedHistory as historyItem, idx}
								{@const isLast = idx === feedHistory.length - 1}
								<div class="flex items-stretch gap-2">
									<div class=" ">
										<div class="pt-2 px-1 mb-1">
											<span class="relative flex size-1.5 rounded-full justify-center items-center">
												<span
													class="relative inline-flex size-1.5 rounded-full bg-gray-400 dark:bg-gray-600"
												></span>
											</span>
										</div>
										{#if !isLast}
											<div
												class="w-[0.5px] ml-[6.5px] h-[calc(100%-12px)] bg-gray-200 dark:bg-gray-800"
											></div>
										{/if}
									</div>
									<StatusItem status={historyItem} done={true} {compactDesk} />
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{:else}
			{@const expandable = feedHistory.length > 1 || hasReasoning}
			<!-- Chat: ONE tray. Top header = the status outcome ("Retrieved 5 sources"),
			     or "Thought process" when the turn only reasoned. The model's full
			     chain-of-thought is nested INSIDE on expand (not a second header). -->
			<div class="text-sm flex flex-col w-full">
				<button
					class="w-full flex items-center gap-1.5 text-left"
					aria-label={$i18n.t('Toggle status history')}
					aria-expanded={showHistory}
					on:click={() => {
						showHistory = !showHistory;
					}}
				>
					{#if status}
						<StatusItem {status} done={headerDone} />
					{:else}
						<span class="text-gray-500 dark:text-gray-500 text-base"
							>{$i18n.t('Thought process')}</span
						>
					{/if}
					{#if expandable}
						<ChevronDown
							className="size-3.5 shrink-0 text-gray-400 dark:text-gray-600 transition-transform {showHistory
								? 'rotate-180'
								: ''}"
							strokeWidth="2.5"
						/>
					{/if}
				</button>

				{#if showHistory && expandable}
					<div class="mt-1 flex flex-col gap-1">
						{#if feedHistory.length > 1}
							<div class="w-full">
								{#each displayHistory as historyItem, idx}
									{@const isLast = idx === displayHistory.length - 1}
									{@const settled = stepSettled[idx]}
									{@const isActiveDot = !settled && !!mindColor}
									<div class="flex items-stretch gap-2 mb-1">
										<div class=" ">
											<div class="pt-3 px-1 mb-1.5">
												<span
													class="relative flex size-1.5 rounded-full justify-center items-center"
												>
													<span
														class="relative inline-flex size-1.5 rounded-full {isActiveDot
															? 'enos-mind-dot'
															: 'bg-gray-500 dark:bg-gray-400'}"
														style={isActiveDot ? `background-color: ${mindColor}` : ''}
													></span>
												</span>
											</div>
											{#if !isLast}
												<div
													class="w-[0.5px] ml-[6.5px] h-[calc(100%-14px)] bg-gray-300 dark:bg-gray-700"
												></div>
											{/if}
										</div>

										<StatusItem status={historyItem} done={settled} />
									</div>
								{/each}
							</div>
						{/if}

						{#if hasReasoning}
							{#if status}
								<!-- nested sub-collapsible only when a status header is present;
								     reasoning-only turns already say "Thought process" on top. -->
								<div class="ml-1">
									<button
										class="flex items-center gap-1.5 text-left text-gray-500 dark:text-gray-500"
										aria-expanded={showReasoning}
										on:click={() => (showReasoning = !showReasoning)}
									>
										<span class="text-sm">{$i18n.t('Thought process')}</span>
										<ChevronDown
											className="size-3 shrink-0 text-gray-400 dark:text-gray-600 transition-transform {showReasoning
												? 'rotate-180'
												: ''}"
											strokeWidth="2.5"
										/>
									</button>
									{#if showReasoning}
										<div
											class="mt-1 whitespace-pre-wrap text-gray-500 dark:text-gray-500 text-sm leading-relaxed max-h-80 overflow-y-auto pr-2"
										>
											{reasoningText}
										</div>
									{/if}
								</div>
							{:else}
								<div
									class="whitespace-pre-wrap text-gray-500 dark:text-gray-500 text-sm leading-relaxed max-h-80 overflow-y-auto pr-2"
								>
									{reasoningText}
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
{/if}

<style>
	/* Motion = state (not extra color): the live mind dot gently pulses while in
	   progress; it is never rendered once done, so the timeline stays calm. */
	.enos-mind-dot {
		animation: enos-mind-pulse 1.4s ease-in-out infinite;
	}
	@keyframes enos-mind-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.enos-mind-dot {
			animation: none;
		}
	}
</style>
