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
		folders,
		chats,
		currentChatPage
	} from '$lib/stores';
	import { composeWelcomeGreeting } from '$lib/enos/greeting';
	import { isDeskHostname } from '$lib/enos/deskRuntime';

	import Suggestions from './Suggestions.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import EyeSlash from '$lib/components/icons/EyeSlash.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
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

	$: isDesk = isDeskHostname();

	// Top-level projects only, sorted by most recently updated.
	$: topFolders = ($folders ?? [])
		.filter((f: any) => f.parent_id === null)
		.sort((a: any, b: any) => (b.updated_at ?? 0) - (a.updated_at ?? 0))
		.slice(0, 5);

	// Chat count per folder from the loaded chat list.
	$: chatCountByFolder = ($chats ?? []).reduce((acc: Record<string, number>, c: any) => {
		if (c.folder_id) acc[c.folder_id] = (acc[c.folder_id] ?? 0) + 1;
		return acc;
	}, {});

	const relativeTime = (ts: number | string | null | undefined) => {
		if (!ts) return '';
		const ms = typeof ts === 'string' ? Date.parse(ts) : ts * 1000;
		const diffSec = Math.floor((Date.now() - ms) / 1000);
		if (diffSec < 60) return 'just now';
		if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
		if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
		if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d ago`;
		return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	};
</script>

{#if $selectedFolder}
	<!-- Project view: centered single column (knowledge added via the + button) -->
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
			class="w-full text-3xl text-gray-800 dark:text-gray-100 flex items-center gap-4 font-primary"
		>
			<div class="@md:max-w-3xl w-full mx-auto flex flex-col">
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

				<div class="text-base font-normal w-full pb-3">
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
			</div>
		</div>

		<div
			class="mx-auto px-4 md:max-w-3xl md:px-6 font-primary min-h-62"
			in:fade={{ duration: 200, delay: 200 }}
		>
			<FolderPlaceholder folder={$selectedFolder} {isDesk} />
		</div>
	</div>
{:else}
	<!-- Greeting view (no folder) -->
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
				<div
					id="enos-welcome-greeting"
					class="enos-display mb-3 @md:mb-4 max-w-2xl px-5 text-center text-4xl @md:text-5xl text-gray-900 dark:text-gray-50"
					in:fade={{ duration: 100 }}
				>
					{welcomeGreeting}
				</div>

				<div class="text-base font-normal @md:max-w-3xl w-full pb-3">
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
			</div>
		</div>

		<div class="mx-auto max-w-2xl font-primary mt-6" in:fade={{ duration: 200, delay: 200 }}>
			{#if isDesk}
				<div class="mx-5 mb-6">
					<div class="mb-3 text-xs font-medium text-gray-600 dark:text-gray-400 text-left">
						{$i18n.t('Projects')}
					</div>
					<div class="grid grid-cols-3 gap-2.5">
						{#each topFolders as folder (folder.id)}
							<button
								type="button"
								class="text-left rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm p-3.5 transition-all duration-150"
								on:click={() => selectedFolder.set(folder)}
							>
								<div class="size-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2.5">
									<Folder className="size-3.5 text-gray-500 dark:text-gray-400" />
								</div>
								<div class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{folder.name}</div>
								<div class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
									{#if chatCountByFolder[folder.id]}
										{chatCountByFolder[folder.id]} {chatCountByFolder[folder.id] === 1 ? $i18n.t('chat') : $i18n.t('chats')}
										{#if folder.updated_at}· {relativeTime(folder.updated_at)}{/if}
									{:else if folder.updated_at}
										{relativeTime(folder.updated_at)}
									{:else}
										{$i18n.t('No chats yet')}
									{/if}
								</div>
							</button>
						{/each}
						<button
							type="button"
							class="text-left rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm p-3.5 transition-all duration-150"
							on:click={() => window.dispatchEvent(new CustomEvent('enos:new-project'))}
						>
							<div class="size-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2.5">
								<Plus className="size-3.5 text-gray-400 dark:text-gray-500" />
							</div>
							<div class="text-sm font-medium text-gray-500 dark:text-gray-400">{$i18n.t('New project')}</div>
							<div class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{$i18n.t('Start fresh')}</div>
						</button>
					</div>
				</div>
			{/if}
			{#if !isDesk}
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
			{/if}
		</div>
	</div>
{/if}
