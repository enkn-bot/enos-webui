<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { fade } from 'svelte/transition';

	import type { Model } from '$lib/stores';
	import { getChatListByFolderId } from '$lib/apis/chats';

	import MessageInput from './MessageInput.svelte';
	import FolderTitle from './Placeholder/FolderTitle.svelte';
	import ChatPlus from '../icons/ChatPlus.svelte';
	import CloudArrowUp from '../icons/CloudArrowUp.svelte';
	import FolderOpen from '../icons/FolderOpen.svelte';
	import Github from '../icons/Github.svelte';

	const i18n = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let folder: any = null;
	export let workspaceLabel = '';
	export let canCopyProjectToCloud = false;
	export let canCloneFromGithub = false;
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
	export let onChange = (e) => {};
	export let toolServers = [];
	export let dragged = false;
	export let onFolderUpdate: Function = () => {};
	export let onFolderDelete: Function = () => {};

	let recentChats: any[] | null = null;
	let lastFolderId: string | null = null;

	const loadRecentChats = async (folderId: string) => {
		recentChats = null;
		const res = await getChatListByFolderId(localStorage.token, folderId, 1).catch((error) => {
			console.warn('[desk project home chats]', error);
			return [];
		});
		recentChats = (res ?? []).slice(0, 4);
	};

	$: if (folder?.id && folder.id !== lastFolderId) {
		lastFolderId = folder.id;
		loadRecentChats(folder.id);
	}

	const focusComposer = async () => {
		await messageInput?.setText?.(prompt ?? '');
	};

	const titleFor = (chat: any) => String(chat?.title ?? '').trim() || $i18n.t('New Chat');
</script>

<div class="m-auto w-full max-w-5xl px-5 @2xl:px-16 py-20 font-primary" in:fade={{ duration: 120 }}>
	<div class="mx-auto max-w-3xl">
		<FolderTitle folder={folder} onUpdate={onFolderUpdate} onDelete={onFolderDelete} />

		{#if workspaceLabel}
			<div class="-mt-1 mb-7 text-center text-sm text-gray-500 dark:text-gray-400">
				{workspaceLabel}
			</div>
		{/if}

		<div class="text-base font-normal w-full">
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
				placeholder={$i18n.t('Ask about this project or start a task')}
				{onChange}
				{onUpload}
				on:submit={(e) => dispatch('submit', e.detail)}
			/>
		</div>

		<div class="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
			<button
				type="button"
				class="flex items-center gap-2 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
				on:click={focusComposer}
			>
				<ChatPlus className="size-4" strokeWidth="2" />
				{$i18n.t('New project chat')}
			</button>

			<button
				type="button"
				class="flex items-center gap-2 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
				on:click={() => dispatch('open-files')}
			>
				<FolderOpen className="size-4" strokeWidth="2" />
				{$i18n.t('Open files')}
			</button>

			{#if canCopyProjectToCloud}
				<button
					type="button"
					class="flex items-center gap-2 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
					on:click={() => dispatch('copy-to-cloud')}
				>
					<CloudArrowUp className="size-4" strokeWidth="2" />
					{$i18n.t('Copy to cloud')}
				</button>
			{/if}

			{#if canCloneFromGithub}
				<button
					type="button"
					class="flex items-center gap-2 rounded-xl px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
					on:click={() => dispatch('open-environment')}
				>
					<Github className="size-4" strokeWidth="2" />
					{$i18n.t('Clone from GitHub')}
				</button>
			{/if}
		</div>

		<div class="mt-12 mx-auto max-w-2xl">
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
				{$i18n.t('Recent')}
			</div>

			{#if recentChats === null}
				<div class="py-4 text-sm text-gray-400 dark:text-gray-500">
					{$i18n.t('Loading project chats...')}
				</div>
			{:else if recentChats.length === 0}
				<div class="py-4 text-sm text-gray-400 dark:text-gray-500">
					{$i18n.t('No project chats yet')}
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					{#each recentChats as chat (chat.id)}
						<a
							href={`/c/${chat.id}`}
							class="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
						>
							<span class="truncate">{titleFor(chat)}</span>
							<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">
								{chat?.updated_at ? new Date(chat.updated_at * 1000).toLocaleDateString() : ''}
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
