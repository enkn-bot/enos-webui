import {
	deskCurrentLocation,
	deskBadgeKind,
	workspaceBadgeFromFolder,
	type WorkspaceKind,
	type WorkspaceLocation
} from './workspaceBadge';

export type DeskLocationState = {
	location: WorkspaceLocation | null; // where work happens NOW (binary)
	projectKind: WorkspaceKind | null; // bound origin of the active folder
	badgeKind: WorkspaceKind | null; // what the env trigger should show
	readOnly: boolean; // a local project not workable here
	name: string;
};

// Single source for every desk-location fact. Chat, the picker, and the files
// panel all derive from this so they can never disagree (the label-desync bug).
export const deskLocationState = (args: {
	cloudWorkspaceActive: boolean;
	bridgePresent: boolean;
	activeFolder: any;
}): DeskLocationState => {
	const badge = workspaceBadgeFromFolder(args.activeFolder);
	const location = deskCurrentLocation({
		cloudWorkspaceActive: args.cloudWorkspaceActive,
		localBridgePresent: args.bridgePresent,
		projectKind: badge.kind
	});
	const readOnly = location === null && badge.kind === 'local';
	return {
		location,
		projectKind: badge.kind,
		badgeKind: deskBadgeKind({ location, projectKind: badge.kind, bridgePresent: args.bridgePresent }),
		readOnly,
		name: badge.name
	};
};

// Auto-default to Local when a local-bound folder is opened with the bridge
// present: clear any cloud terminal (and disable enabled terminal servers).
// Pure decision; the store mutation stays a thin apply-block in Chat.svelte.
export const localLocationDefaultIntent = (args: {
	activeFolder: any;
	bridgePresent: boolean;
	selectedTerminalId: string | null;
	lastDefaultedFolderId: string | null;
	hasEnabledTerminalServers: boolean;
}): { clearTerminal: boolean; disableTerminalServers: boolean; defaultedFolderId: string | null } => {
	const noop = {
		clearTerminal: false,
		disableTerminalServers: false,
		defaultedFolderId: args.lastDefaultedFolderId
	};
	const fid = args.activeFolder?.id ?? null;
	if (!args.bridgePresent || !fid || fid === args.lastDefaultedFolderId) return noop;
	if (workspaceBadgeFromFolder(args.activeFolder).kind !== 'local') return noop;
	const clearTerminal = Boolean(args.selectedTerminalId);
	return {
		clearTerminal,
		disableTerminalServers: clearTerminal && args.hasEnabledTerminalServers,
		defaultedFolderId: fid
	};
};

// Desktop is local-first at launch. `selectedTerminalId` is globally persisted in
// localStorage and restored on every load ((app)/+layout.svelte), so a system cloud
// workspace (`ws-…`) picked in a prior session would otherwise survive into a fresh
// ENOS Desk launch and force the env badge + Files panel to Cloud — even though the
// desktop bridge is present and no project is open. This clears that stale SYSTEM
// cloud selection once at init so the desktop genuinely starts Local (badge AND files,
// never a desync). Scoped to the system workspace only (`ws-` id) — an explicit
// user-added cloud terminal is left alone — and skipped when a local project is open
// (location follows the project) or on the web desk (no bridge → cloud is correct).
// Apply once per launch behind a guard so an explicit cloud re-select afterward sticks.
export const deskLocalLaunchDefaultIntent = (args: {
	isDeskSurface: boolean;
	bridgePresent: boolean;
	selectedTerminalId: string | null;
	activeLocalProject: boolean;
}): { clearTerminal: boolean } => {
	if (!args.isDeskSurface || !args.bridgePresent || args.activeLocalProject)
		return { clearTerminal: false };
	const isSystemCloud = !!args.selectedTerminalId && args.selectedTerminalId.startsWith('ws-');
	return { clearTerminal: isSystemCloud };
};

// On the web desk surface with no bridge and no terminal selected, default into
// the system cloud workspace so the Files panel has something to render.
export const webDeskCloudDefaultIntent = (args: {
	isDeskSurface: boolean;
	bridgePresent: boolean;
	selectedTerminalId: string | null;
	systemCloudWorkspaceId: string | null;
}): { selectTerminalId: string | null } => {
	if (!args.isDeskSurface || args.bridgePresent || args.selectedTerminalId)
		return { selectTerminalId: null };
	return { selectTerminalId: args.systemCloudWorkspaceId };
};
