<script lang="ts">
	import { WEBUI_BASE_URL } from '$lib/constants';
	import { settings, playingNotificationSound, isLastActiveTab } from '$lib/stores';
	import DOMPurify from 'dompurify';
	import { marked } from 'marked';

	import { createEventDispatcher, onMount } from 'svelte';
	import XMark from '$lib/components/icons/XMark.svelte';

	const dispatch = createEventDispatcher();

	export let onClick: Function = () => {};
	export let onClose: Function = () => {};
	export let title: string = 'HI';
	export let content: string;
	export let action: { label: string; onClick: () => Promise<void> | void } | null = null;

	let startX = 0,
		startY = 0;
	let moved = false;
	let closeButtonElement: HTMLButtonElement;
	let actionButtonElement: HTMLButtonElement;
	const DRAG_THRESHOLD_PX = 6;

	const clickHandler = () => {
		onClick();
		onClose();
		dispatch('closeToast');
	};

	const closeHandler = () => {
		onClose();
		dispatch('closeToast');
	};

	async function handleAction(e: MouseEvent) {
		e.stopPropagation();
		dispatch('closeToast');
		await action?.onClick();
	}

	function onPointerDown(e: PointerEvent) {
		startX = e.clientX;
		startY = e.clientY;
		moved = false;
		// Ensure we continue to get events even if the toast moves under the pointer.
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (moved) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
			moved = true;
		}
	}

	function onPointerUp(e: PointerEvent) {
		// Release capture if taken
		(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

		// Skip if clicking the close or action button
		if (
			closeButtonElement &&
			(e.target === closeButtonElement || closeButtonElement.contains(e.target as Node))
		) {
			return;
		}
		if (
			actionButtonElement &&
			(e.target === actionButtonElement || actionButtonElement.contains(e.target as Node))
		) {
			return;
		}

		// Only treat as a click if there wasn't a drag
		if (!moved) {
			clickHandler();
		}
	}

	onMount(() => {
		if (!navigator.userActivation.hasBeenActive) {
			return;
		}

		if ($settings?.notificationSound ?? true) {
			if (!$playingNotificationSound && $isLastActiveTab) {
				playingNotificationSound.set(true);

				const audio = new Audio(`/audio/notification.mp3`);
				audio.play().finally(() => {
					// Ensure the global state is reset after the sound finishes
					playingNotificationSound.set(false);
				});
			}
		}
	});
</script>

<div
	role="button"
	aria-live="polite"
	aria-label={title ? `Open notification: ${title}` : 'Open notification'}
	tabindex="0"
	class="group relative flex gap-2.5 text-left min-w-[var(--width)] w-full dark:bg-gray-850 dark:text-white bg-white text-black border border-gray-100 dark:border-gray-800 rounded-3xl px-4 py-3.5 cursor-pointer select-none"
	on:dragstart|preventDefault
	on:pointerdown={onPointerDown}
	on:pointermove={onPointerMove}
	on:pointerup={onPointerUp}
	on:pointercancel={() => (moved = true)}
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			clickHandler();
		}
	}}
>
	<!-- Close button (visible on hover) -->
	<button
		bind:this={closeButtonElement}
		class="absolute -top-0.5 -left-0.5 p-0.5 rounded-full opacity-0 group-hover:opacity-100 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-opacity z-10"
		on:pointerdown|stopPropagation
		on:click|stopPropagation={closeHandler}
		aria-label="Dismiss notification"
	>
		<XMark className="size-3" />
	</button>

	<div class="shrink-0 self-top -translate-y-0.5">
		<img
			src="{WEBUI_BASE_URL}/static/favicon.png?v=enos-20260614-flat-logo-v2"
			alt="ENOS"
			class="size-6 rounded-full"
		/>
	</div>

	<div class="flex-1 min-w-0">
		{#if title}
			<div class=" text-[13px] font-medium mb-0.5 line-clamp-1">{title}</div>
		{/if}

		<div class=" line-clamp-2 text-xs self-center dark:text-gray-300 font-normal">
			{@html DOMPurify.sanitize(marked(DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })))}
		</div>
	</div>

	{#if action}
		<div class="shrink-0 self-center">
			<button
				bind:this={actionButtonElement}
				class="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-80 transition-opacity"
				on:pointerdown|stopPropagation
				on:click={handleAction}
			>
				{action.label}
			</button>
		</div>
	{/if}
</div>
