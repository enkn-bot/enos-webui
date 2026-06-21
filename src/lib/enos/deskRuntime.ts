import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';

/**
 * Single source of truth for the two orthogonal Desk axes.
 *
 *  - SURFACE (where): which host the app is served from. `desk` => project-first
 *    Desk UX; `chat` => the loose-chat surface. Decided purely by hostname, so it
 *    is identical in the browser and in the desktop app.
 *  - MODE (how): which runtime is hosting the surface. `app` => the desktop
 *    runtime injected a local bridge (local files / git / reveal available).
 *    `browser` => web only — a deliberately supported *lite* mode: chats and
 *    model conversation work, local-filesystem capability does not.
 *
 * Keep all surface/runtime checks routed through here so adding a future runtime
 * (or renaming the host) is a one-file change.
 */

/** Canonical Desk surface hostname. */
export const DESK_HOSTNAME = 'enosdesk.duckdns.org';

export type DeskSurface = 'desk' | 'chat';
export type DeskMode = 'app' | 'browser';

export type DeskRuntime = {
	surface: DeskSurface;
	mode: DeskMode;
	/** surface === 'desk' */
	isDesk: boolean;
	/** mode === 'app' (local capability available) */
	isApp: boolean;
	/** desk surface running in the browser — the supported lite mode */
	isDeskLite: boolean;
};

/** True when served from the Desk host. SSR-safe (false on the server). */
export const isDeskHostname = (): boolean => {
	if (typeof window === 'undefined') return false;
	return window.location.hostname === DESK_HOSTNAME;
};

export const deskSurface = (): DeskSurface => (isDeskHostname() ? 'desk' : 'chat');

/** `app` when the desktop bridge is present, else `browser` (lite). */
export const deskMode = (): DeskMode => (getEnosDesktopBridge() ? 'app' : 'browser');

export const getDeskRuntime = (): DeskRuntime => {
	const surface = deskSurface();
	const mode = deskMode();
	return {
		surface,
		mode,
		isDesk: surface === 'desk',
		isApp: mode === 'app',
		isDeskLite: surface === 'desk' && mode === 'browser'
	};
};
