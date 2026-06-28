<script lang="ts">
	import { getContext, tick } from 'svelte';

	import Spinner from '$lib/components/common/Spinner.svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import Cloud from '$lib/components/icons/Cloud.svelte';
	import Computer from '$lib/components/icons/Computer.svelte';
	import Document from '$lib/components/icons/Document.svelte';
	import FolderIcon from '$lib/components/icons/Folder.svelte';

	import { toast } from 'svelte-sonner';
	import { user, config } from '$lib/stores';

	import Textarea from '$lib/components/common/Textarea.svelte';
	import Knowledge from '$lib/components/workspace/Models/Knowledge.svelte';
	import { getFolderById } from '$lib/apis/folders';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import { isDeskHostname } from '$lib/enos/deskRuntime';
	import { browser } from '$app/environment';
	const i18n = getContext('i18n');

	type ProjectEnvironment = 'local' | 'cloud';
	type ProjectStartMode = 'folder' | 'clean';
	type CloudWorkspaceOption = { id: string; name: string };

	export let show = false;
	export let onSubmit: Function = (e) => {};

	export let folderId = null;
	export let parentId = null;
	export let edit = false;
	export let initialFolder = null;
	export let projectEditMode = false;
	export let showLocalFolderAction = false;
	export let cloudOnlyProjectMode = false;
	export let cloudWorkspaceOptions: CloudWorkspaceOption[] = [];
	export let selectedCloudWorkspaceId: string | null = null;
	export let onCloudWorkspaceSelect: Function = async () => {};
	export let onLocalFolderPick: Function = async () => {};

	let folder = null;
	let name = '';
	let meta = {
		background_image_url: null
	};
	let data = {
		system_prompt: '',
		files: []
	};
	let localWorkspace = null;
	let projectEnvironment: ProjectEnvironment = 'cloud';
	let projectStartMode: ProjectStartMode = 'clean';
	let lastShow = false;

	let loading = false;

	$: canUseLocalProject = showLocalFolderAction && Boolean(getEnosDesktopBridge());
	$: submitLabel = edit ? $i18n.t('Save') : $i18n.t('Create project');
	$: showLegacyFolderOptions = edit && !projectEditMode;
	// Project environment (Local vs ENOS Cloud) is a Desk-surface concept. On the
	// Chat surface a "project" is just a plain folder, so the Desk location/workspace
	// chooser must never render there.
	$: isDeskSurface = browser && isDeskHostname();
	$: showProjectSetupOptions = !edit && !cloudOnlyProjectMode && isDeskSurface;
	$: selectedCloudWorkspaceName = cloudWorkspaceOptions.find(
		(option) => option.id === selectedCloudWorkspaceId
	)?.name;
	$: selectedCloudWorkspaceLabel =
		!selectedCloudWorkspaceName || selectedCloudWorkspaceName === 'Cloud Workspace'
			? $i18n.t('ENOS Cloud')
			: selectedCloudWorkspaceName;

	const selectCloudWorkspace = async (id: string) => {
		selectedCloudWorkspaceId = id;
		await onCloudWorkspaceSelect(id);
	};

	const defaultProjectEnvironment = (): ProjectEnvironment =>
		cloudOnlyProjectMode ? 'cloud' : canUseLocalProject ? 'local' : 'cloud';

	const resetCreateState = () => {
		name = '';
		meta = {
			background_image_url: null
		};
		data = {
			system_prompt: '',
			files: []
		};
		localWorkspace = null;
		projectEnvironment = cloudOnlyProjectMode ? 'cloud' : defaultProjectEnvironment();
		projectStartMode = 'clean';
	};

	const applyInitialFolder = (value) => {
		if (!value) return;

		folder = value;
		name = value.name ?? '';
		meta = value.meta || {
			background_image_url: null
		};
		data = value.data || {
			system_prompt: '',
			files: []
		};
	};

	const setProjectEnvironment = (environment: ProjectEnvironment) => {
		if (environment === 'local' && !canUseLocalProject) return;
		projectEnvironment = environment;
		localWorkspace = null;
		projectStartMode = 'clean';
	};

	const createCleanWorkspace = async () => {
		const bridge = getEnosDesktopBridge();
		if (!bridge?.createCleanWorkspace) {
			throw new Error($i18n.t('Restart ENOS Desk to create a local project.'));
		}
		return await bridge.createCleanWorkspace(name.trim());
	};

	const selectLocalFolder = async () => {
		if (cloudOnlyProjectMode) return null;
		projectEnvironment = 'local';
		projectStartMode = 'folder';
		const workspace = await onLocalFolderPick();
		if (!workspace) return null;
		localWorkspace = workspace;
		if (!name?.trim()) {
			name = workspace.name;
		}
		return workspace;
	};

	const submitHandler = async () => {
		loading = true;

		try {
			if (!name.trim()) {
				toast.error($i18n.t('Project name is required.'));
				return;
			}

			if (!edit && projectEnvironment === 'local' && !localWorkspace) {
				if (projectStartMode === 'folder') {
					const workspace = await selectLocalFolder();
					if (!workspace) return;
				} else {
					localWorkspace = await createCleanWorkspace();
				}
			}

			if ((data?.files ?? []).some((file) => file.status === 'uploading')) {
				toast.error($i18n.t('Please wait until all files are uploaded.'));
				return;
			}

			// Check folder max file count limit
			const maxFileCount = $config?.features?.folder_max_file_count ?? '';
			if (maxFileCount && (data?.files ?? []).length > maxFileCount) {
				toast.error(
					$i18n.t('Maximum number of files per folder is {{max}}.', { max: maxFileCount ?? 0 })
				);
				return;
			}

			const submitted = await onSubmit({
				name,
				meta,
				data,
				localWorkspace,
				projectEnvironment,
				parent_id: edit ? undefined : parentId
			});
			if (submitted === false) return;
			show = false;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : `${error}`);
		} finally {
			loading = false;
		}
	};

	const init = async () => {
		if (folderId) {
			applyInitialFolder(initialFolder);

			const fetchedFolder = await getFolderById(localStorage.token, folderId).catch((error) => {
				toast.error(`${error}`);
				return null;
			});
			applyInitialFolder(fetchedFolder);
		} else {
			resetCreateState();
		}

		focusInput();
	};

	const focusInput = async () => {
		await tick();
		const input = document.getElementById('folder-name') as HTMLInputElement;
		if (input) {
			input.focus();
			input.select();
		}
	};

	$: if (show && !lastShow) {
		init();
	}
	$: lastShow = show;

	$: if (!show && !edit) {
		resetCreateState();
	}

	$: if (cloudOnlyProjectMode) {
		projectEnvironment = 'cloud';
		projectStartMode = 'clean';
		localWorkspace = null;
	}
</script>

<Modal
	size={cloudOnlyProjectMode ? 'sm' : 'md'}
	bind:show
	className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-[1.75rem]"
>
	<form
		class="px-6 py-5 dark:text-gray-200"
		on:submit|preventDefault={() => {
			submitHandler();
		}}
	>
		<div class="flex items-start justify-between gap-4">
			<div class="text-xl font-semibold tracking-normal">
				{#if edit}
					{$i18n.t('Edit project')}
				{:else}
					{$i18n.t('New project')}
				{/if}
			</div>
			<button
				type="button"
				class="rounded-full p-1 text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-850"
				aria-label={$i18n.t('Close')}
				on:click={() => {
					show = false;
				}}
			>
				<XMark className="size-5" />
			</button>
		</div>

		<div class="mt-5">
			<label for="folder-name" class="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
				{$i18n.t('Project name')}
			</label>
			<input
				id="folder-name"
				class="w-full rounded-2xl border border-gray-200 bg-transparent px-4 py-3 text-sm outline-hidden transition placeholder:text-gray-400 focus:border-gray-400 dark:border-gray-800 dark:placeholder:text-gray-600 dark:focus:border-gray-600"
				type="text"
				bind:value={name}
				placeholder={$i18n.t('Untitled project')}
				autocomplete="off"
			/>
		</div>

		{#if cloudOnlyProjectMode}
			<div class="mt-5">
				<label
					for="cloud-workspace"
					class="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300"
				>
					{$i18n.t('ENOS Cloud space')}
				</label>
				{#if cloudWorkspaceOptions.length > 1}
					<select
						id="cloud-workspace"
						class="w-full rounded-2xl border border-gray-200 bg-transparent px-4 py-3 text-sm outline-hidden transition focus:border-gray-400 dark:border-gray-800 dark:focus:border-gray-600"
						value={selectedCloudWorkspaceId ?? ''}
						on:change={(event) => selectCloudWorkspace(event.currentTarget.value)}
					>
						{#each cloudWorkspaceOptions as option (option.id)}
							<option value={option.id}>{option.name}</option>
						{/each}
					</select>
				{:else}
					<div class="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
						<div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
							<Cloud className="size-5" strokeWidth="2" />
						</div>
						<div class="min-w-0">
							<div class="truncate font-medium">{selectedCloudWorkspaceLabel}</div>
							<div class="truncate text-xs text-gray-500 dark:text-gray-400">
								{$i18n.t('ENOS Cloud environment')}
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if showProjectSetupOptions}
			<div class="mt-6">
				<div class="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
					{$i18n.t('Where should this project live?')}
				</div>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<button
						type="button"
						aria-pressed={projectEnvironment === 'local'}
						class="relative rounded-2xl border p-4 text-left transition {projectEnvironment ===
						'local'
							? 'border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-900'
							: 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'} {!canUseLocalProject
							? 'cursor-not-allowed opacity-45'
							: ''}"
						disabled={!canUseLocalProject}
						on:click={() => setProjectEnvironment('local')}
					>
						<div class="flex gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
								<Computer className="size-5" strokeWidth="2" />
							</div>
							<div class="min-w-0">
								<div class="text-sm font-semibold">{$i18n.t('Local project')}</div>
								<div class="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
									{canUseLocalProject
										? $i18n.t('Stored on this device. Best for private work and offline use.')
										: $i18n.t('Local projects require the desktop app.')}
								</div>
							</div>
						</div>
						{#if projectEnvironment === 'local'}
							<div class="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
								<Check className="size-3.5" strokeWidth="3" />
							</div>
						{/if}
					</button>
					<button
						type="button"
						aria-pressed={projectEnvironment === 'cloud'}
						class="relative rounded-2xl border p-4 text-left transition {projectEnvironment ===
						'cloud'
							? 'border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-900'
							: 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'}"
						on:click={() => setProjectEnvironment('cloud')}
					>
						<div class="flex gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
								<Cloud className="size-5" strokeWidth="2" />
							</div>
							<div class="min-w-0">
								<div class="text-sm font-semibold">{$i18n.t('ENOS Cloud project')}</div>
								<div class="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
									{$i18n.t('Synced to your ENOS workspace. Access across devices.')}
								</div>
							</div>
						</div>
						{#if projectEnvironment === 'cloud'}
							<div class="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
								<Check className="size-3.5" strokeWidth="3" />
							</div>
						{/if}
					</button>
				</div>
			</div>

			<div class="mt-6">
				<div class="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
					{$i18n.t('How do you want to start?')}
				</div>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<button
						type="button"
						aria-pressed={projectStartMode === 'clean'}
						class="relative rounded-2xl border p-4 text-left transition {projectStartMode === 'clean'
							? 'border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-900'
							: 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'}"
						on:click={() => {
							localWorkspace = null;
							projectStartMode = 'clean';
						}}
					>
						<div class="flex gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
								<Document className="size-5" strokeWidth="2" />
							</div>
							<div class="min-w-0">
								<div class="text-sm font-semibold">{$i18n.t('Create a new project')}</div>
								<div class="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
									{projectEnvironment === 'local'
										? $i18n.t('ENOS will create a fresh app-managed folder on this device.')
										: $i18n.t('ENOS will create a fresh folder in ENOS Cloud.')}
								</div>
							</div>
						</div>
						{#if projectStartMode === 'clean'}
							<div class="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
								<Check className="size-3.5" strokeWidth="3" />
							</div>
						{/if}
					</button>
					<button
						type="button"
						aria-pressed={projectStartMode === 'folder'}
						class="relative rounded-2xl border p-4 text-left transition {projectStartMode === 'folder'
							? 'border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-900'
							: 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'} {projectEnvironment !==
						'local'
							? 'cursor-not-allowed opacity-45'
							: ''}"
						disabled={projectEnvironment !== 'local'}
						on:click={selectLocalFolder}
					>
						<div class="flex gap-3">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
								<FolderIcon className="size-5" strokeWidth="2" />
							</div>
							<div class="min-w-0">
								<div class="text-sm font-semibold">
									{localWorkspace ? $i18n.t('Local folder selected') : $i18n.t('Use an existing folder')}
								</div>
								<div class="mt-1 line-clamp-2 text-sm leading-5 text-gray-500 dark:text-gray-400">
									{localWorkspace?.rootDisplay ??
										(projectEnvironment === 'local'
											? $i18n.t('Connect ENOS to a folder already on this device.')
											: $i18n.t('Available for local projects.'))}
								</div>
							</div>
						</div>
						{#if projectStartMode === 'folder'}
							<div class="absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
								<Check className="size-3.5" strokeWidth="3" />
							</div>
						{/if}
					</button>
				</div>
			</div>
		{/if}

		{#if showLegacyFolderOptions}
					<input
						id="folder-background-image-input"
						type="file"
						hidden
						accept="image/*"
						on:change={(e) => {
							const inputFiles = e.target.files;

							let reader = new FileReader();
							reader.onload = (event) => {
								let originalImageUrl = `${event.target.result}`;
								meta.background_image_url = originalImageUrl;
							};

							if (
								inputFiles &&
								inputFiles.length > 0 &&
								['image/gif', 'image/webp', 'image/jpeg', 'image/png'].includes(
									inputFiles[0]['type']
								)
							) {
								reader.readAsDataURL(inputFiles[0]);
							} else {
								console.log(`Unsupported File Type '${inputFiles[0]['type']}'.`);

								// clear the input
								e.target.value = '';
							}
						}}
					/>

					<div class="flex justify-between w-full mt-1 items-center">
						<div class="text-xs text-gray-500">{$i18n.t('Folder Background Image')}</div>

						<div class="">
							<button
								aria-labelledby="chat-background-label background-image-url-state"
								class="p-1 px-3 text-xs flex rounded-sm transition"
								on:click={() => {
									if (meta?.background_image_url !== null) {
										meta.background_image_url = null;
									} else {
										const input = document.getElementById('folder-background-image-input');
										if (input) {
											input.click();
										}
									}
								}}
								type="button"
							>
								<span class="ml-2 self-center" id="background-image-url-state"
									>{(meta?.background_image_url ?? null) === null
										? $i18n.t('Upload')
										: $i18n.t('Reset')}</span
								>
							</button>
						</div>
					</div>

					<hr class=" border-gray-50 dark:border-gray-850/30 my-2.5 w-full" />

					{#if $user?.role === 'admin' || ($user?.permissions.chat?.system_prompt ?? true)}
						<div class="my-1">
							<div class="mb-2 text-xs text-gray-500">{$i18n.t('System Prompt')}</div>
							<div>
								<Textarea
									className=" text-sm w-full bg-transparent outline-hidden "
									placeholder={$i18n.t(
										'Write your model system prompt content here\ne.g.) You are Mario from Super Mario Bros, acting as an assistant.'
									)}
									maxSize={200}
									bind:value={data.system_prompt}
								/>
							</div>
						</div>
					{/if}

					<div class="my-2">
						<Knowledge
							bind:selectedItems={data.files}
							leadingActionLabel={showLocalFolderAction && !edit ? 'Select Folder' : ''}
							onLeadingAction={selectLocalFolder}
							hideUploadFiles={showLocalFolderAction && !edit}
						>
							<div slot="label">
								<div class="flex w-full justify-between">
									<div class=" mb-2 text-xs text-gray-500">
										{$i18n.t('Project Knowledge')}
									</div>
								</div>
							</div>
						</Knowledge>
					</div>
					{/if}

		<div class="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4 text-sm font-medium dark:border-gray-800">
			<button
				type="button"
				class="rounded-full px-4 py-2 transition hover:bg-gray-100 dark:hover:bg-gray-850"
				on:click={() => {
					show = false;
				}}
			>
				{$i18n.t('Cancel')}
			</button>
			<button
				class="flex items-center rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-950 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-gray-100"
				type="submit"
				disabled={loading}
			>
				{submitLabel}

				{#if loading}
					<div class="ml-2 self-center">
						<Spinner />
					</div>
				{/if}
			</button>
		</div>
	</form>
</Modal>
