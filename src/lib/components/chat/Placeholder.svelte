<script lang="ts">
	import { getContext, createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	import { getChatList } from '$lib/apis/chats';

	import {
		config,
		user,
		models as _models,
		temporaryChatEnabled,
		selectedFolder,
		chats,
		currentChatPage,
		showDeskFolderPicker
	} from '$lib/stores';
	import { composeWelcomeGreeting } from '$lib/enos/greeting';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import { isDeskHostname } from '$lib/enos/deskRuntime';

	import Suggestions from './Suggestions.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import EyeSlash from '$lib/components/icons/EyeSlash.svelte';
	import MessageInput from './MessageInput.svelte';
	import FolderPlaceholder from './Placeholder/FolderPlaceholder.svelte';
	import FolderTitle from './Placeholder/FolderTitle.svelte';

	const i18n = getContext('i18n');

	export let createMessagePair: Function;
	export let stopResponse: Function;

	export let autoScroll = false;

	export let atSelectedModel: Model | undefined;
	export let selectedModels: [''];

	export let history;

	export let prompt = '';
	export let files = [];
	export let messageInput = null;

	export let selectedToolIds = [];
	export let selectedSkillIds = [];
	export let selectedFilterIds = [];
	export let pendingOAuthTools = [];

	export let showCommands = false;

	export let imageGenerationEnabled = false;
	export let codeInterpreterEnabled = false;
	export let webSearchEnabled = false;

	export let onUpload: Function = (e) => {};
	export let onSelect = (e) => {};
	export let onChange = (e) => {};

	export let toolServers = [];

	export let dragged = false;

	let models = [];
	let selectedModelIdx = 0;
	const welcomeGreeting = composeWelcomeGreeting(
		new Date(),
		($user?.name ?? '').trim().split(/\s+/)[0] ?? ''
	);

	$: if (selectedModels.length > 0) {
		selectedModelIdx = models.length - 1;
	}

	$: models = selectedModels.map((id) => $_models.find((m) => m.id === id));

	// F2: on Desk the empty state IS the welcome — it teaches the runtime model.
	$: isDesk = isDeskHostname();
	$: hasBridge = Boolean(getEnosDesktopBridge());
	// Infra is DEFAULTED by surface and SHOWN, never chosen as a first action:
	// the app works on this machine first; the web surface runs in ENOS Cloud.
	$: deskInfraLine = hasBridge
		? $i18n.t('Working on this Mac · private to you')
		: $i18n.t('Running in ENOS Cloud · reachable anywhere');
</script>

<div class="m-auto w-full max-w-6xl px-2 @2xl:px-20 translate-y-6 py-24 text-center">
	{#if $temporaryChatEnabled}
		<Tooltip
			content={$i18n.t("This chat won't appear in history and your messages will not be saved.")}
			className="w-full flex justify-center mb-0.5"
			placement="top"
		>
			<div class="flex items-center gap-2 text-gray-500 text-base my-2 w-fit">
				<EyeSlash strokeWidth="2.5" className="size-4" />{$i18n.t('Temporary Chat')}
			</div>
		</Tooltip>
	{/if}

	<div
		class="w-full text-3xl text-gray-800 dark:text-gray-100 text-center flex items-center gap-4 font-primary"
	>
		<div class="w-full flex flex-col justify-center items-center">
			{#if $selectedFolder}
				<FolderTitle
					folder={$selectedFolder}
					onUpdate={async (folder) => {
						await chats.set(await getChatList(localStorage.token, $currentChatPage));
						currentChatPage.set(1);
					}}
					onDelete={async () => {
						await chats.set(await getChatList(localStorage.token, $currentChatPage));
						currentChatPage.set(1);

						window.dispatchEvent(
							new CustomEvent('enos:project-deleted', { detail: { folderId: $selectedFolder?.id } })
						);
						selectedFolder.set(null);
					}}
				/>
			{:else}
				<div
					id="enos-welcome-greeting"
					class="enos-display mb-6 @md:mb-8 max-w-2xl px-5 text-center text-3xl @md:text-4xl text-gray-900 dark:text-gray-50"
					in:fade={{ duration: 100 }}
				>
					{welcomeGreeting}
				</div>
			{/if}

			<div class="text-base font-normal @md:max-w-3xl w-full py-3 {atSelectedModel ? 'mt-2' : ''}">
				<MessageInput
					bind:this={messageInput}
					{history}
					bind:selectedModels
					bind:files
					bind:prompt
					bind:autoScroll
					bind:selectedToolIds
					bind:selectedSkillIds
					bind:selectedFilterIds
					bind:imageGenerationEnabled
					bind:codeInterpreterEnabled
					bind:webSearchEnabled
					bind:atSelectedModel
					bind:showCommands
					bind:dragged
					{pendingOAuthTools}
					{toolServers}
					{stopResponse}
					{createMessagePair}
					placeholder={isDesk
						? $i18n.t('What are we building?')
						: $i18n.t('How can I help you today?')}
					{onChange}
					{onUpload}
					on:submit={(e) => {
						dispatch('submit', e.detail);
					}}
				/>
			</div>

			{#if isDesk && !$selectedFolder}
				<!-- Infra line: SHOWN (defaulted by surface), not a first action. -->
				<div class="mt-2 text-xs text-gray-400 dark:text-gray-500">{deskInfraLine}</div>
				<!-- Doorways: quiet links (the input is the hero), surface-specific.
				     Each points at an EXISTING action — no invented flows. "Bring a repo"
				     is intentionally omitted until a single repo-bring action exists
				     (connect→list→clone is a flow, not a one-click affordance — rendering
				     it now would light a dead affordance). -->
				<div
					class="mt-3 flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-500"
				>
					<button
						type="button"
						class="hover:text-gray-600 dark:hover:text-gray-300 transition"
						on:click={() => document.getElementById('sidebar-new-chat-button')?.click()}
						>{$i18n.t('Start fresh')}</button
					>
					{#if hasBridge}
						<span aria-hidden="true">·</span>
						<button
							type="button"
							class="hover:text-gray-600 dark:hover:text-gray-300 transition"
							on:click={() => showDeskFolderPicker.set(true)}>{$i18n.t('Open a folder')}</button
						>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if $selectedFolder}
		<div
			class="mx-auto px-4 md:max-w-3xl md:px-6 font-primary min-h-62"
			in:fade={{ duration: 200, delay: 200 }}
		>
			<FolderPlaceholder folder={$selectedFolder} />
		</div>
	{:else}
		<div class="mx-auto max-w-2xl font-primary mt-2" in:fade={{ duration: 200, delay: 200 }}>
			<div class="mx-5">
				<Suggestions
					suggestionPrompts={atSelectedModel?.info?.meta?.suggestion_prompts ??
						models[selectedModelIdx]?.info?.meta?.suggestion_prompts ??
						$config?.default_prompt_suggestions ??
						[]}
					inputValue={prompt}
					{onSelect}
				/>
			</div>
		</div>
	{/if}
</div>
