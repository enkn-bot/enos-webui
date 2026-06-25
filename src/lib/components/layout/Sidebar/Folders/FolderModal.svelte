<script lang="ts">
	import { getContext, tick } from 'svelte';

	import Spinner from '$lib/components/common/Spinner.svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';

	import { toast } from 'svelte-sonner';
	import { user, config } from '$lib/stores';

	import Textarea from '$lib/components/common/Textarea.svelte';
	import Knowledge from '$lib/components/workspace/Models/Knowledge.svelte';
	import { getFolderById } from '$lib/apis/folders';
	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	const i18n = getContext('i18n');

	type ProjectEnvironment = 'local' | 'cloud';
	type ProjectStartMode = 'folder' | 'clean';

	export let show = false;
	export let onSubmit: Function = (e) => {};

	export let folderId = null;
	export let parentId = null;
	export let edit = false;
	export let showLocalFolderAction = false;
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
	$: submitLabel = edit
		? $i18n.t('Save')
		: projectEnvironment === 'cloud'
			? $i18n.t('Create cloud project')
			: localWorkspace
				? $i18n.t('Create from folder')
				: projectStartMode === 'clean'
					? $i18n.t('Create clean local project')
					: $i18n.t('Create local project');

	const defaultProjectEnvironment = (): ProjectEnvironment => (canUseLocalProject ? 'local' : 'cloud');

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
		projectEnvironment = defaultProjectEnvironment();
		projectStartMode = 'clean';
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
			folder = await getFolderById(localStorage.token, folderId).catch((error) => {
				toast.error(`${error}`);
				return null;
			});

			name = folder.name;
			meta = folder.meta || {
				background_image_url: null
			};
			data = folder.data || {
				system_prompt: '',
				files: []
			};
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
</script>

<Modal size="md" bind:show>
	<div>
		<div class=" flex justify-between dark:text-gray-300 px-5 pt-4 pb-1">
			<div class=" text-lg font-medium self-center">
				{#if edit}
					{$i18n.t('Edit Project')}
				{:else}
					{$i18n.t('New Project')}
				{/if}
			</div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<XMark className={'size-5'} />
			</button>
		</div>

		<div class="flex flex-col md:flex-row w-full px-5 pb-4 md:space-x-4 dark:text-gray-200">
			<div class=" flex flex-col w-full sm:flex-row sm:justify-center sm:space-x-6">
				<form
					class="flex flex-col w-full"
					on:submit|preventDefault={() => {
						submitHandler();
					}}
				>
					<div class="flex flex-col w-full mt-1">
						<div class=" mb-1 text-xs text-gray-500">{$i18n.t('Project Name')}</div>

						<div class="flex-1">
							<input
								id="folder-name"
								class="w-full text-sm bg-transparent placeholder:text-gray-300 dark:placeholder:text-gray-700 outline-hidden"
								type="text"
								bind:value={name}
								placeholder={$i18n.t('Project name')}
								autocomplete="off"
							/>
						</div>
					</div>

					{#if !edit}
						<div class="mt-5">
							<div class="mb-2 text-xs text-gray-500">{$i18n.t('Environment')}</div>
							<div class="grid grid-cols-2 gap-2">
								<button
									type="button"
									class="rounded-2xl border px-3 py-2 text-left transition {projectEnvironment ===
									'local'
										? 'border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-800'
										: 'border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-850'} {!canUseLocalProject
										? 'cursor-not-allowed opacity-45'
										: ''}"
									disabled={!canUseLocalProject}
									on:click={() => setProjectEnvironment('local')}
								>
									<div class="text-sm font-medium">{$i18n.t('Local')}</div>
									<div class="text-xs text-gray-500">
										{canUseLocalProject
											? $i18n.t('This device')
											: $i18n.t('Open in desktop app')}
									</div>
								</button>
								<button
									type="button"
									class="rounded-2xl border px-3 py-2 text-left transition {projectEnvironment ===
									'cloud'
										? 'border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-800'
										: 'border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-850'}"
									on:click={() => setProjectEnvironment('cloud')}
								>
									<div class="text-sm font-medium">{$i18n.t('Cloud')}</div>
									<div class="text-xs text-gray-500">{$i18n.t('ENOS workspace')}</div>
								</button>
							</div>
						</div>

						<div class="mt-4 rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
							{#if projectEnvironment === 'local'}
								<div class="grid grid-cols-2 gap-2">
									<button
										type="button"
										class="rounded-xl border px-3 py-2 text-left transition {projectStartMode ===
										'clean'
											? 'border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-800'
											: 'border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-850'}"
										on:click={() => {
											localWorkspace = null;
											projectStartMode = 'clean';
										}}
									>
										<div class="text-sm font-medium">{$i18n.t('Start clean')}</div>
										<div class="mt-1 text-xs text-gray-500">
											{$i18n.t('Create a new folder in Documents/ENOS.')}
										</div>
									</button>
									<button
										type="button"
										class="rounded-xl border px-3 py-2 text-left transition {projectStartMode ===
										'folder'
											? 'border-gray-900 bg-gray-50 dark:border-gray-100 dark:bg-gray-800'
											: 'border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-850'}"
										on:click={selectLocalFolder}
									>
										<div class="text-sm font-medium">
											{localWorkspace ? $i18n.t('Local folder selected') : $i18n.t('Choose local folder')}
										</div>
										<div class="mt-1 truncate text-xs text-gray-500">
											{localWorkspace?.rootDisplay ??
												$i18n.t('Pick an existing folder on this device.')}
										</div>
									</button>
								</div>
							{:else}
								<div class="text-sm font-medium">{$i18n.t('Create cloud project')}</div>
								<div class="mt-1 text-xs text-gray-500">
									{$i18n.t('Start in your private cloud workspace.')}
								</div>
							{/if}
						</div>
					{/if}

					{#if edit}
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

					<div class="flex justify-end pt-3 text-sm font-medium gap-1.5">
						<button
							class="px-3.5 py-1.5 text-sm font-medium bg-black hover:bg-gray-950 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full flex flex-row space-x-1 items-center {loading
								? ' cursor-not-allowed'
								: ''}"
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
			</div>
		</div>
	</div>
</Modal>
