import type { DeskChatMessage, DeskCompletion } from '$lib/enos/deskAgentLoop';
import type { DeskToolSpec } from '$lib/enos/deskFileTools';

export type EnosDesktopPlatform = 'electron' | 'tauri' | 'swift';
export type EnosDesktopPermissionProfile = 'ask' | 'approve_safe_project_edits';
export type EnosDesktopAccessMode = 'read-only' | 'auto' | 'full';

export type EnosDesktopCapabilities = {
	desktopBridge: true;
	version: string;
	platform: EnosDesktopPlatform;
	localProjectFiles: boolean;
	localProjectMutations: boolean;
	localProjectReveal: boolean;
	localProjectGitStatus: boolean;
	localProjectGitRead?: boolean;
	localProjectGitWrite: boolean;
	localProjectGitClone: boolean;
	localProjectCloudUpload?: boolean;
	githubOAuth?: boolean;
	piRpc?: boolean;
};

export type EnosDesktopWorkspace = {
	folderId?: string | null;
	name: string;
	rootDisplay: string;
	selectedAt: string | null;
};

export type EnosDesktopEntry = {
	name: string;
	path: string;
	type: 'directory' | 'file';
	size: number | null;
	modifiedAt: string;
};

export type EnosDesktopDirectoryListing = {
	rootName: string;
	path: string;
	entries: EnosDesktopEntry[];
};

export type EnosDesktopFilePreview = {
	name: string;
	path: string;
	size: number;
	modifiedAt: string;
	mime: string;
	encoding: 'utf8' | 'base64';
	data: string;
};

export type EnosDesktopProjectDigest = {
	generatedAt: string;
	rootName: string;
	fileCount: number;
	sampledFileCount: number;
	skippedCount: number;
	outline: string[];
	snippets: {
		path: string;
		size: number;
		modifiedAt: string;
		text: string;
	}[];
	text: string;
};

export type EnosDesktopProjectDirectoryListing = EnosDesktopDirectoryListing & {
	action: 'listProjectFiles';
};

export type EnosDesktopProjectFilePreview = EnosDesktopFilePreview & {
	action: 'readProjectFile';
};

export type EnosDesktopProjectArchive = {
	action: 'exportProjectArchive';
	format: 'tar';
	encoding: 'base64';
	rootName: string;
	bytes: number;
	data: string;
	excluded?: string[];
};

export type EnosDesktopProjectWriteRequest = {
	action: 'writeProjectFile';
	status: 'requires_confirmation';
	path: string;
	bytes: number;
	preview: string;
};

export type EnosDesktopProjectActionOptions = {
	confirmed?: boolean;
};

export type EnosDesktopProjectActionRequest = {
	action:
		| 'createProjectFile'
		| 'writeProjectFile'
		| 'createProjectFolder'
		| 'renameProjectEntry'
		| 'deleteProjectEntry'
		| 'stageProjectChanges'
		| 'commitProjectChanges'
		| 'createProjectBranch'
		| 'cloneProjectRepository';
	status: 'requires_confirmation';
	path: string;
	toPath?: string;
	paths?: string[];
	branch?: string;
	repositoryUrl?: string;
	bytes: number;
	preview: string;
};

export type EnosDesktopProjectActionResult = {
	action:
		| 'createProjectFile'
		| 'writeProjectFile'
		| 'createProjectFolder'
		| 'renameProjectEntry'
		| 'deleteProjectEntry'
		| 'revealProjectEntry'
		| 'stageProjectChanges'
		| 'commitProjectChanges'
		| 'createProjectBranch'
		| 'cloneProjectRepository';
	status:
		| 'created'
		| 'written'
		| 'renamed'
		| 'trashed'
		| 'revealed'
		| 'staged'
		| 'committed'
		| 'created_branch'
		| 'cloned';
	path: string;
	toPath?: string;
	paths?: string[];
	branch?: string;
	repositoryUrl?: string;
	commit?: string;
	bytes?: number;
	modifiedAt?: string;
};

export type EnosDesktopProjectGitStatus = {
	action: 'getProjectGitStatus';
	isRepo: boolean;
	branch: string | null;
	statusLines: string[];
};

export type EnosDesktopProjectGitLog = {
	action: 'getProjectGitLog';
	isRepo: boolean;
	logLines: string[];
	truncated?: boolean;
};

export type EnosDesktopProjectGitDiff = {
	action: 'getProjectGitDiff';
	isRepo: boolean;
	path: string;
	diff: string;
	truncated?: boolean;
};

export type EnosDesktopPiEvent =
	| { streamId: string; event: unknown }
	| { streamId: string; done: true }
	| { streamId: string; error: unknown };

export type EnosDesktopPiBridge = {
	start: (folderId: string) => Promise<{ port: number; sessionId: string }>;
	prompt: (folderId: string, prompt: string, agent?: string) => Promise<{ streamId: string }>;
	events: (onEvent: (event: EnosDesktopPiEvent) => void) => () => void;
	stop: (folderId: string) => Promise<void>;
};

export type EnosDesktopBridge = {
	version: string;
	platform: EnosDesktopPlatform;
	getTitleBarStyle?: () => Promise<'hiddenInset' | 'default'>;
	getCapabilities: () => Promise<EnosDesktopCapabilities>;
	chooseWorkspace: () => Promise<EnosDesktopWorkspace | null>;
	chooseWorkspaceForFolder: (folderId: string) => Promise<EnosDesktopWorkspace | null>;
	bindWorkspaceToFolder: (folderId: string) => Promise<EnosDesktopWorkspace | null>;
	createCleanWorkspace?: (projectName: string) => Promise<EnosDesktopWorkspace | null>;
	openGithubOAuth?: (
		authorizeUrl: string
	) => Promise<{ ok: true; url?: string } | { ok: false; error: string; url?: string }>;
	getWorkspace: (folderId?: string | null) => Promise<EnosDesktopWorkspace | null>;
	listDir: (path?: string, folderId?: string | null) => Promise<EnosDesktopDirectoryListing>;
	readFile: (path: string, folderId?: string | null) => Promise<EnosDesktopFilePreview>;
	buildProjectDigest: (folderId: string) => Promise<EnosDesktopProjectDigest>;
	listProjectFiles: (
		folderId: string,
		path?: string
	) => Promise<EnosDesktopProjectDirectoryListing>;
	readProjectFile: (folderId: string, path: string) => Promise<EnosDesktopProjectFilePreview>;
	exportProjectArchive?: (folderId: string) => Promise<EnosDesktopProjectArchive>;
	requestProjectFileWrite: (
		folderId: string,
		path: string,
		content: string
	) => Promise<EnosDesktopProjectWriteRequest>;
	getAccessMode?: () => Promise<EnosDesktopAccessMode>;
	setAccessMode?: (mode: EnosDesktopAccessMode) => Promise<EnosDesktopAccessMode>;
	getPermissionProfile: () => Promise<EnosDesktopPermissionProfile>;
	setPermissionProfile: (
		permissionProfile: EnosDesktopPermissionProfile
	) => Promise<EnosDesktopPermissionProfile>;
	createProjectFile: (
		folderId: string,
		path: string,
		content?: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	writeProjectFile: (
		folderId: string,
		path: string,
		content: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	createProjectFolder: (
		folderId: string,
		path: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	renameProjectEntry: (
		folderId: string,
		fromPath: string,
		toPath: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	deleteProjectEntry: (
		folderId: string,
		path: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	revealProjectEntry: (folderId: string, path: string) => Promise<EnosDesktopProjectActionResult>;
	getProjectGitStatus: (folderId: string) => Promise<EnosDesktopProjectGitStatus>;
	getProjectGitLog?: (folderId: string) => Promise<EnosDesktopProjectGitLog>;
	getProjectGitDiff?: (folderId: string, path?: string) => Promise<EnosDesktopProjectGitDiff>;
	gitStage: (
		folderId: string,
		paths: string[],
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	gitCommit: (
		folderId: string,
		message: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	gitCreateBranch: (
		folderId: string,
		branchName: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	gitClone: (
		folderId: string,
		repositoryUrl: string,
		targetPath: string,
		options?: EnosDesktopProjectActionOptions
	) => Promise<EnosDesktopProjectActionRequest | EnosDesktopProjectActionResult>;
	/** Desk-local model call — available only in newer Electron builds. */
	agentComplete?: (messages: DeskChatMessage[], tools: DeskToolSpec[]) => Promise<DeskCompletion>;
	/**
	 * Streaming Desk-local model call. Emits content deltas to `onChunk` for live
	 * prose animation and resolves with the same shape as agentComplete. Present
	 * only in newer Electron builds; callers must feature-detect.
	 */
	agentCompleteStream?: (
		messages: DeskChatMessage[],
		tools: DeskToolSpec[],
		streamId: string,
		onChunk: (delta: string) => void
	) => Promise<DeskCompletion>;
	pi?: EnosDesktopPiBridge;
	/**
	 * Local PTY shell bridge — present only in newer Electron builds; callers
	 * must feature-detect. Renderer owns the sessionId.
	 */
	localTerminal?: {
		start: (
			sessionId: string,
			folderId: string | null,
			cols: number,
			rows: number
		) => Promise<string>;
		write: (sessionId: string, data: string) => Promise<void>;
		resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
		kill: (sessionId: string) => Promise<void>;
		onData: (cb: (payload: { sessionId: string; data: string }) => void) => () => void;
		onExit: (
			cb: (payload: { sessionId: string; code?: number; error?: string }) => void
		) => () => void;
	};
};

declare global {
	interface Window {
		enosDesktop?: EnosDesktopBridge;
	}
}

export const getEnosDesktopBridge = (): EnosDesktopBridge | null => {
	if (typeof window === 'undefined') return null;
	return window.enosDesktop ?? null;
};

export const getEnosDesktopBridgeCapabilities =
	async (): Promise<EnosDesktopCapabilities | null> => {
		const bridge = getEnosDesktopBridge();
		if (!bridge || typeof bridge.getCapabilities !== 'function') return null;

		try {
			const capabilities = await bridge.getCapabilities();
			return capabilities?.desktopBridge ? capabilities : null;
		} catch {
			return null;
		}
	};

export const canUseEnosLocalProjectFiles = (capabilities?: EnosDesktopCapabilities | null) =>
	Boolean(capabilities?.desktopBridge && capabilities.localProjectFiles);

export const canUseEnosLocalProjectMutations = (capabilities?: EnosDesktopCapabilities | null) =>
	Boolean(canUseEnosLocalProjectFiles(capabilities) && capabilities?.localProjectMutations);

export const canUseEnosLocalProjectGitWrite = (capabilities?: EnosDesktopCapabilities | null) =>
	Boolean(canUseEnosLocalProjectFiles(capabilities) && capabilities?.localProjectGitWrite);

export const canUseEnosLocalProjectGitRead = (capabilities?: EnosDesktopCapabilities | null) =>
	Boolean(
		canUseEnosLocalProjectFiles(capabilities) &&
		(capabilities?.localProjectGitRead ?? capabilities?.localProjectGitStatus)
	);

export const canUseEnosLocalProjectGitClone = (capabilities?: EnosDesktopCapabilities | null) =>
	Boolean(canUseEnosLocalProjectFiles(capabilities) && capabilities?.localProjectGitClone);

export const canUseEnosLocalProjectCloudUpload = (capabilities?: EnosDesktopCapabilities | null) =>
	Boolean(canUseEnosLocalProjectFiles(capabilities) && capabilities?.localProjectCloudUpload);

export const canUseEnosLocalPi = (capabilities?: EnosDesktopCapabilities | null) =>
	Boolean(capabilities?.piRpc);
