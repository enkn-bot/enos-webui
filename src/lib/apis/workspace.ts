// ENOS cloud-workspace control-plane API client. Talks to /api/ws/* (Caddy proxies
// it to the workspace service alongside OWUI). Every call carries the OWUI token;
// the service verifies it and scopes everything to the calling user.
import { WEBUI_BASE_URL } from '$lib/constants';
import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';

const base = `${WEBUI_BASE_URL}/api/ws`;

const authHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	'Content-Type': 'application/json'
});

export type CloudWorkspace = {
	id: string;
	state: 'provisioning' | 'running' | 'stopped' | string;
	host_port?: number;
	kind?: string;
};

/** Provision (or return) the caller's cloud workspace. Resolves once it's running. */
export const createCloudWorkspace = async (token: string): Promise<CloudWorkspace> => {
	const res = await fetch(`${base}/workspaces`, { method: 'POST', headers: authHeaders(token) });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `create failed (${res.status})`);
	return data.workspace;
};

/** Current cloud workspace, or null if none. */
export const getCloudWorkspace = async (token: string): Promise<CloudWorkspace | null> => {
	const res = await fetch(`${base}/workspaces`, { headers: authHeaders(token) });
	if (!res.ok) return null;
	return (await res.json())?.workspace ?? null;
};

export const getGithubStatus = async (
	token: string
): Promise<{ connected: boolean; login: string | null }> => {
	const res = await fetch(`${base}/github/status`, { headers: authHeaders(token) });
	if (!res.ok) return { connected: false, login: null };
	return await res.json();
};

/** Begin the GitHub OAuth flow: fetch the authorize URL (authed), then navigate to it. */
export const connectGithub = async (token: string): Promise<void> => {
	const res = await fetch(`${base}/github/connect`, { headers: authHeaders(token) });
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data?.authorize_url) throw new Error(data?.error ?? 'github connect unavailable');
	const desktopBridge = getEnosDesktopBridge();
	if (desktopBridge?.openGithubOAuth) {
		const result = await desktopBridge.openGithubOAuth(data.authorize_url);
		if (!result?.ok) throw new Error(result?.error ?? 'GitHub connect failed');
		return;
	}
	window.location.href = data.authorize_url;
};

export type GithubRepo = { full_name: string; default_branch: string };

/** The connected account's repos (most-recently-pushed first). */
export const listGithubRepos = async (token: string): Promise<GithubRepo[]> => {
	const res = await fetch(`${base}/github/repos`, { headers: authHeaders(token) });
	if (!res.ok) return [];
	return (await res.json())?.repos ?? [];
};

/** Clone `owner/name` (optionally a branch) into the caller's running cloud workspace. */
export const cloneRepo = async (
	token: string,
	repo: string,
	branch = ''
): Promise<{ cloned: string; branch: string; dest: string }> => {
	const res = await fetch(`${base}/github/clone`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify({ repo, branch })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data?.error ?? `clone failed (${res.status})`);
	return data;
};
