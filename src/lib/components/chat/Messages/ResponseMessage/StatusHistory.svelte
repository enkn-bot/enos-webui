<script>
	import { getContext } from 'svelte';
	const i18n = getContext('i18n');

	import StatusItem from './StatusHistory/StatusItem.svelte';
	import equal from 'fast-deep-equal';
	import { enosOrbColorForModel } from '$lib/enos/modelTier';
	import { selectDisplayStatus } from '$lib/enos/cognitionVocabulary';
	export let statusHistory = [];
	export let expand = false;
	export let compactDesk = false;
	export let modelId = null;
	export let answerPresent = false;

	let showHistory = true;

	// Restrained "who is acting" color: tint ONLY the live (in-progress) indicator dot
	// to the active mind's orb tone (Subconscious/Conscious/Ego). Null for unknown/idle
	// → neutral, no false attribution. Never applied to the persisted/expanded trail.
	$: mindColor = enosOrbColorForModel(modelId);
	$: inProgress = status?.done !== true;

	$: if (expand) {
		showHistory = true;
	} else {
		showHistory = false;
	}

	let history = [];
	let status = null;

	// Persistence rule: while streaming, show the latest live status; once the answer is
	// present, collapse to the last MEANINGFUL outcome and drop a trailing transient
	// ("Done"/"Composing") — a plain answer with no outcome shows nothing.
	$: if (history && history.length > 0) {
		status = selectDisplayStatus(history, answerPresent);
	} else {
		status = null;
	}

	$: if (!equal(statusHistory, history)) {
		history = statusHistory;
	}
</script>

{#if history && history.length > 0 && status}
	{#if status?.hidden !== true}
		{#if compactDesk}
			<div class="text-sm flex flex-col w-full">
				<div class="flex items-center gap-2">
					{#if inProgress && mindColor}
						<span
							class="relative inline-flex size-1.5 rounded-full flex-shrink-0 enos-mind-dot"
							style="background-color: {mindColor};"
						></span>
					{/if}
					<StatusItem {status} {compactDesk} />
				</div>
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
					<div class="flex items-center gap-2">
						{#if inProgress && mindColor}
							<span
								class="relative inline-flex size-1.5 rounded-full flex-shrink-0 enos-mind-dot"
								style="background-color: {mindColor};"
							></span>
						{/if}
						<StatusItem {status} />
					</div>
				</button>

				{#if showHistory}
					<div class="flex flex-row">
						{#if history.length > 1}
							<div class="w-full">
								{#each history as status, idx}
									<div class="flex items-stretch gap-2 mb-1">
										<div class=" ">
											<div class="pt-3 px-1 mb-1.5">
												<span class="relative flex size-1.5 rounded-full justify-center items-center">
													<span
														class="relative inline-flex size-1.5 rounded-full bg-gray-500 dark:bg-gray-400"
													></span>
												</span>
											</div>
											{#if idx !== history.length - 1}
												<div
													class="w-[0.5px] ml-[6.5px] h-[calc(100%-14px)] bg-gray-300 dark:bg-gray-700"
												></div>
											{/if}
										</div>

										<StatusItem {status} done={true} />
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
