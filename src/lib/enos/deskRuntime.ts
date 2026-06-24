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
const DESK_HOSTNAME = 'enosdesk.duckdns.org';

/** True when served from the Desk host. SSR-safe (false on the server). */
export const isDeskHostname = (): boolean => {
	if (typeof window === 'undefined') return false;
	return window.location.hostname === DESK_HOSTNAME;
};
