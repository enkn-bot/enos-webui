import { WEBUI_API_BASE_URL } from '$lib/constants';

export type CloudWorkspaceTerminalLike = {
	id?: string | null;
	url?: string | null;
	name?: string | null;
	key?: string | null;
	[key: string]: unknown;
};

export const isSystemCloudWorkspaceTerminal = (terminal: CloudWorkspaceTerminalLike | null) =>
	Boolean(terminal?.id && String(terminal.id).startsWith('ws-'));

export const cloudWorkspaceTerminalEntries = (
	terminals: CloudWorkspaceTerminalLike[] = [],
	token = ''
) =>
	terminals.filter(isSystemCloudWorkspaceTerminal).map((terminal) => ({
		...terminal,
		id: String(terminal.id),
		url: `${WEBUI_API_BASE_URL}/terminals/${terminal.id}`,
		name: String(terminal.name ?? terminal.id ?? ''),
		key: token
	}));

export const mergeCloudWorkspaceTerminalEntries = (
	existing: CloudWorkspaceTerminalLike[] = [],
	refreshed: CloudWorkspaceTerminalLike[] = [],
	token = ''
) => {
	const nextCloudEntries = cloudWorkspaceTerminalEntries(refreshed, token);
	const entries = new Map<string, CloudWorkspaceTerminalLike>();

	for (const terminal of existing) {
		if (!terminal?.id || isSystemCloudWorkspaceTerminal(terminal)) continue;
		entries.set(String(terminal.id), terminal);
	}

	for (const terminal of nextCloudEntries) {
		entries.set(String(terminal.id), terminal);
	}

	return Array.from(entries.values());
};

export const selectCloudWorkspaceTerminal = ({
	terminals = [],
	workspaceId = null,
	selectedId = null,
	token = ''
}: {
	terminals?: CloudWorkspaceTerminalLike[];
	workspaceId?: string | null;
	selectedId?: string | null;
	token?: string;
}) => {
	const entries = cloudWorkspaceTerminalEntries(terminals, token);
	return (
		entries.find((terminal) => terminal.id === workspaceId) ??
		entries.find((terminal) => terminal.id === selectedId) ??
		entries[0] ??
		null
	);
};
