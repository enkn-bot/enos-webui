export type EnosDesktopPlatform = 'electron' | 'tauri' | 'swift';

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

export type EnosDesktopBridge = {
	version: string;
	platform: EnosDesktopPlatform;
	chooseWorkspace: () => Promise<EnosDesktopWorkspace | null>;
	chooseWorkspaceForFolder: (folderId: string) => Promise<EnosDesktopWorkspace | null>;
	bindWorkspaceToFolder: (folderId: string) => Promise<EnosDesktopWorkspace | null>;
	getWorkspace: (folderId?: string | null) => Promise<EnosDesktopWorkspace | null>;
	listDir: (path?: string, folderId?: string | null) => Promise<EnosDesktopDirectoryListing>;
	readFile: (path: string, folderId?: string | null) => Promise<EnosDesktopFilePreview>;
	buildProjectDigest: (folderId: string) => Promise<EnosDesktopProjectDigest>;
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
