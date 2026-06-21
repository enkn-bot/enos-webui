<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';

	import {
		banners,
		chatId,
		config,
		mobile,
		settings,
		showControls,
		showSidebar,
		temporaryChatEnabled,
		user
	} from '$lib/stores';

	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import ShareChatModal from '../chat/ShareChatModal.svelte';
	import ModelSelector from '../chat/ModelSelector.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import Menu from '$lib/components/layout/Navbar/Menu.svelte';

	import Banner from '../common/Banner.svelte';
	import Sidebar from '../icons/Sidebar.svelte';

	import ChatBubbleDotted from '../icons/ChatBubbleDotted.svelte';
	import ChatBubbleDottedChecked from '../icons/ChatBubbleDottedChecked.svelte';

	import EllipsisHorizontal from '../icons/EllipsisHorizontal.svelte';
	import ChatPlus from '../icons/ChatPlus.svelte';
	import ChatCheck from '../icons/ChatCheck.svelte';
	import ChevronDown from '../icons/ChevronDown.svelte';
	import Plus from '../icons/Plus.svelte';
	import DeskWorkspacePicker from '$lib/components/enos/DeskWorkspacePicker.svelte';

	const i18n = getContext('i18n');

	export let initNewChat: Function;
	export let shareEnabled: boolean = false;
	export let scrollTop = 0;
	export let scrollToTop: (() => void) | null = null;

	export let chat;
	export let history;
	export let title = '';
	export let selectedModels;
	export let showModelSelector = true;
	export let deskWorkspaceName = '';

	export let onSaveTempChat: () => {};
	export let onRenameChat: (title: string) => void | Promise<void> = () => {};
	export let archiveChatHandler: (id: string) => void;
	export let deleteChatHandler: (id: string) => void;
	export let moveChatHandler: (id: string, folderId: string) => void;

	let closedBannerIds = [];

	const getDismissedBannerIds = (): string[] => {
		try {
			return JSON.parse(localStorage.getItem('dismissedBannerIds') ?? '[]');
		} catch {
			return [];
		}
	};

	let showShareChatModal = false;
	let isDeskSurface = false;
	let editingTitle = false;
	let titleDraft = '';
	let titleInputElement: HTMLInputElement;
	let showDeskWorkspacePicker = false;

	onMount(() => {
		isDeskSurface = window.location.hostname === 'enosdesk.duckdns.org';
	});

	const normalizeTitle = (value) => (typeof value === 'string' ? value.trim() : '');
	const chatTitleLabel = () =>
		normalizeTitle(title) ||
		normalizeTitle(chat?.chat?.title) ||
		normalizeTitle(chat?.title) ||
		$i18n.t('New Chat');
	const deskWorkspaceLabel = () => normalizeTitle(deskWorkspaceName) || $i18n.t('Select workspace…');

	$: deskWorkspaceNameLabel = normalizeTitle(deskWorkspaceName);
	$: hasDeskWorkspace = Boolean(deskWorkspaceNameLabel);

	const beginTitleRename = async () => {
		if (!isDeskSurface) return;
		titleDraft = chatTitleLabel();
		editingTitle = true;
		await tick();
		titleInputElement?.focus();
		titleInputElement?.select();
	};

	const commitTitleRename = async () => {
		const nextTitle = normalizeTitle(titleDraft);
		if (!nextTitle || nextTitle === chatTitleLabel()) {
			editingTitle = false;
			titleDraft = chatTitleLabel();
			return;
		}
		await onRenameChat(nextTitle);
		editingTitle = false;
	};

	const cancelTitleRename = () => {
		editingTitle = false;
		titleDraft = chatTitleLabel();
	};
</script>

<ShareChatModal bind:show={showShareChatModal} chatId={$chatId} />

<button
	id="new-chat-button"
	class="hidden"
	on:click={() => {
		initNewChat();
	}}
	aria-label="New Chat"
/>

<nav
	class="sticky top-0 z-30 w-full {chat?.id
		? 'pt-0.5 pb-1'
		: 'pt-1 pb-1'} -mb-12 flex flex-col items-center drag-region"
>
	<div class="flex items-center w-full pl-1.5 pr-1">
		<div
			id="navbar-bg-gradient-to-b"
			class="{chat?.id
				? 'visible'
				: 'invisible'} bg-linear-to-b via-40% to-97% from-white/90 via-white/50 to-transparent dark:from-gray-900/90 dark:via-gray-900/50 dark:to-transparent pointer-events-none absolute inset-0 -bottom-10 z-[-1]"
		></div>

		<div class=" flex max-w-full w-full mx-auto px-1.5 md:px-2 pt-0.5 bg-transparent">
			<div class="flex items-center w-full max-w-full">
				{#if $mobile && !$showSidebar}
					<div
						class="-translate-x-0.5 mr-1 mt-1 self-start flex flex-none items-center text-gray-600 dark:text-gray-400"
					>
						<Tooltip content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}>
							<button
								class=" cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition"
								on:click={() => {
									showSidebar.set(!$showSidebar);
								}}
							>
								<div class=" self-center p-1.5">
									<Sidebar />
								</div>
							</button>
						</Tooltip>
					</div>
				{/if}

				<div
					class="flex-1 overflow-hidden max-w-full mt-0.5 py-0.5
			{$showSidebar ? 'ml-1' : ''}
			"
				>
					{#if isDeskSurface && shareEnabled && chat && (chat.id || $temporaryChatEnabled)}
						{#if editingTitle}
							<input
								bind:this={titleInputElement}
								bind:value={titleDraft}
								id="chat-title-rename-input"
								class="max-w-full w-64 rounded-xl px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 outline-hidden"
								aria-label={$i18n.t('Rename chat')}
								on:keydown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										commitTitleRename();
									} else if (event.key === 'Escape') {
										event.preventDefault();
										cancelTitleRename();
									}
								}}
								on:blur={commitTitleRename}
							/>
						{:else}
							<Menu
								{chat}
								{shareEnabled}
								{scrollToTop}
								align="start"
								shareHandler={() => {
									showShareChatModal = !showShareChatModal;
								}}
								archiveChatHandler={() => {
									archiveChatHandler(chat.id);
								}}
								deleteChatHandler={() => {
									deleteChatHandler(chat.id);
								}}
								{moveChatHandler}
							>
								<button
									type="button"
									id="chat-title-menu-button"
									class="flex max-w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
									aria-label={$i18n.t('Chat options')}
									on:dblclick|preventDefault|stopPropagation={beginTitleRename}
								>
									<span class="truncate">{chatTitleLabel()}</span>
									<ChevronDown className="size-3 shrink-0" strokeWidth="2.5" />
								</button>
							</Menu>
						{/if}
					{:else if showModelSelector}
						<ModelSelector bind:selectedModels showSetDefault={!shareEnabled} />
					{/if}
				</div>

				<div id="navbar-right-actions" class="self-start flex flex-none items-center text-gray-600 dark:text-gray-400">
					<!-- <div class="md:hidden flex self-center w-[1px] h-5 mx-2 bg-gray-300 dark:bg-stone-700" /> -->

					{#if isDeskSurface}
						<DeskWorkspacePicker bind:show={showDeskWorkspacePicker}>
							<button
								id="desk-workspace-status-button"
								type="button"
								class="max-w-[12rem] flex items-center gap-1.5 cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition text-sm"
								aria-label={deskWorkspaceLabel()}
							>
								{#if hasDeskWorkspace}
									<span class="truncate max-w-[10rem]">{deskWorkspaceNameLabel}</span>
								{:else}
									<Plus className="size-4 shrink-0" strokeWidth="2" />
									<span class="truncate">{deskWorkspaceLabel()}</span>
								{/if}
							</button>
						</DeskWorkspacePicker>
					{/if}

					{#if $user?.role === 'user' ? ($user?.permissions?.chat?.temporary ?? true) && !($user?.permissions?.chat?.temporary_enforced ?? false) : true}
						{#if !chat?.id}
							<Tooltip content={$i18n.t(`Temporary Chat`)}>
								<button
									class="flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition"
									id="temporary-chat-button"
									on:click={async () => {
										if (($settings?.temporaryChatByDefault ?? false) && $temporaryChatEnabled) {
											// for proper initNewChat handling
											await temporaryChatEnabled.set(null);
										} else {
											await temporaryChatEnabled.set(!$temporaryChatEnabled);
										}

										if ($page.url.pathname !== '/') {
											await goto('/');
										}

										// add 'temporary-chat=true' to the URL
										if ($temporaryChatEnabled) {
											window.history.replaceState(null, '', '?temporary-chat=true');
										} else {
											window.history.replaceState(null, '', location.pathname);
										}
									}}
								>
									<div class=" m-auto self-center">
										{#if $temporaryChatEnabled}
											<ChatBubbleDottedChecked className=" size-4.5" strokeWidth="1.5" />
										{:else}
											<ChatBubbleDotted className=" size-4.5" strokeWidth="1.5" />
										{/if}
									</div>
								</button>
							</Tooltip>
						{:else if $temporaryChatEnabled}
							<Tooltip content={$i18n.t(`Save Chat`)}>
								<button
									class="flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition"
									id="save-temporary-chat-button"
									on:click={async () => {
										onSaveTempChat();
									}}
								>
									<div class=" m-auto self-center">
										<ChatCheck className=" size-4.5" strokeWidth="1.5" />
									</div>
								</button>
							</Tooltip>
						{/if}
					{/if}

					{#if $mobile && !$temporaryChatEnabled && chat && chat.id}
						<Tooltip content={$i18n.t('New Chat')}>
							<button
								class=" flex {$showSidebar
									? 'md:hidden'
									: ''} cursor-pointer px-2 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								on:click={() => {
									initNewChat();
								}}
								aria-label="New Chat"
							>
								<div class=" m-auto self-center">
									<ChatPlus className=" size-4.5" strokeWidth="1.5" />
								</div>
							</button>
						</Tooltip>
					{/if}

					{#if shareEnabled && chat && (chat.id || $temporaryChatEnabled)}
						<Menu
							{chat}
							{shareEnabled}
							{scrollToTop}
							shareHandler={() => {
								showShareChatModal = !showShareChatModal;
							}}
							archiveChatHandler={() => {
								archiveChatHandler(chat.id);
							}}
							deleteChatHandler={() => {
								deleteChatHandler(chat.id);
							}}
							{moveChatHandler}
						>
							<button
								class="flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								id="chat-context-menu-button"
							>
								<div class=" m-auto self-center">
									<EllipsisHorizontal className=" size-5" strokeWidth="1.5" />
								</div>
							</button>
						</Menu>
					{/if}

					{#if isDeskSurface && ($user?.role === 'admin' || ($user?.permissions.chat?.controls ?? true))}
						<Tooltip content={$i18n.t('Controls')}>
							<button
								class=" flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								on:click={async () => {
									await showControls.set(!$showControls);
								}}
								aria-label="Controls"
							>
								<div class=" m-auto self-center">
									<Sidebar className=" size-5" strokeWidth="1.5" style="transform: scaleX(-1)" />
								</div>
							</button>
						</Tooltip>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if $temporaryChatEnabled && ($chatId ?? '').startsWith('local:')}
		<div class=" w-full z-30 text-center">
			<div class="text-xs text-gray-500">{$i18n.t('Temporary Chat')}</div>
		</div>
	{/if}

	<div class="absolute top-[100%] left-0 right-0 h-fit">
		{#if !history.currentId && !$chatId && ($banners.length > 0 || ($config?.license_metadata?.type ?? null) === 'trial' || (($config?.license_metadata?.seats ?? null) !== null && $config?.user_count > $config?.license_metadata?.seats))}
			<div class=" w-full z-30">
				<div class=" flex flex-col gap-1 w-full">
					{#if ($config?.license_metadata?.type ?? null) === 'trial'}
						<Banner
							banner={{
								type: 'info',
								title: 'Trial License',
								content: $i18n.t(
									'You are currently using a trial license. Please contact support to upgrade your license.'
								)
							}}
						/>
					{/if}

					{#if ($config?.license_metadata?.seats ?? null) !== null && $config?.user_count > $config?.license_metadata?.seats}
						<Banner
							banner={{
								type: 'error',
								title: 'License Error',
								content: $i18n.t(
									'Exceeded the number of seats in your license. Please contact support to increase the number of seats.'
								)
							}}
						/>
					{/if}

					{#each $banners.filter((b) => ![...getDismissedBannerIds(), ...closedBannerIds].includes(b.id)) as banner (banner.id)}
						<Banner
							{banner}
							on:dismiss={(e) => {
								const bannerId = e.detail;

								if (banner.dismissible) {
									localStorage.setItem(
										'dismissedBannerIds',
										JSON.stringify(
											[bannerId, ...getDismissedBannerIds()].filter((id) =>
												$banners.find((b) => b.id === id)
											)
										)
									);
								} else {
									closedBannerIds = [...closedBannerIds, bannerId];
								}
							}}
						/>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</nav>
