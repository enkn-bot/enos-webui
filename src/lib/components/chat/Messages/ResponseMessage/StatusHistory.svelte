<script>
	import { getContext } from 'svelte';
	const i18n = getContext('i18n');

	import StatusItem from './StatusHistory/StatusItem.svelte';
	import equal from 'fast-deep-equal';
	import { enosOrbColorForModel } from '$lib/enos/modelTier';
	import { selectDisplayStatus, normalizeAction, isStepSettled } from '$lib/enos/cognitionVocabulary';
	export let statusHistory = [];
	export let expand = false;
	export let compactDesk = false;
	export let modelId = null;
	export let answerPresent = false;

	let showHistory = true;

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
	const isRenderableStep = (item) =>
		!item?.hidden && item?.description !== 'No search query generated';
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

{#if history && history.length > 0 && status}
	{#if status?.hidden !== true}
		{#if compactDesk}
			<!-- Desk = supervision: an always-visible operational feed. Every step shows on
			     its own line with a leading dot; the mind-color dot rides the active step
			     and the rest stay neutral (done/inactive). No expand/collapse — the
			     sequence (Read → Edited → Ran) IS the value on a coding surface. -->
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
		{:else}
			<div class="text-sm flex flex-col w-full">
				<button
					class="w-full"
					aria-label={$i18n.t('Toggle status history')}
					aria-expanded={showHistory}
					on:click={() => {
						showHistory = !showHistory;
					}}
				>
					<StatusItem {status} done={headerDone} />
				</button>

				{#if showHistory}
					<div class="flex flex-row">
						{#if feedHistory.length > 1}
							<div class="w-full">
								{#each displayHistory as historyItem, idx}
									{@const isLast = idx === displayHistory.length - 1}
									{@const settled = stepSettled[idx]}
									{@const isActiveDot = !settled && !!mindColor}
									<div class="flex items-stretch gap-2 mb-1">
										<div class=" ">
											<div class="pt-3 px-1 mb-1.5">
												<span class="relative flex size-1.5 rounded-full justify-center items-center">
													<span
														class="relative inline-flex size-1.5 rounded-full {isActiveDot ? 'enos-mind-dot' : 'bg-gray-500 dark:bg-gray-400'}"
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
