export type EnosDesktopPlatform = 'electron' | 'tauri' | 'swift';

export type EnosDesktopWorkspace = {
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

export type EnosDesktopBridge = {
	version: string;
	platform: EnosDesktopPlatform;
	chooseWorkspace: () => Promise<EnosDesktopWorkspace | null>;
	getWorkspace: () => Promise<EnosDesktopWorkspace | null>;
	listDir: (path?: string) => Promise<EnosDesktopDirectoryListing>;
	readFile: (path: string) => Promise<EnosDesktopFilePreview>;
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
