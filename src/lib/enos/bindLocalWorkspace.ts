import { updateFolderById } from '$lib/apis/folders';
import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
import {
	hasLinkedHomes,
	linkedHomesFromSource,
	localHomeFromWorkspace,
	type LocalProjectHome
} from '$lib/enos/projectHomes';

export function projectContextSourceFromDigest(
	digest: any,
	workspace?: any,
	previousSource?: any
): {
	kind: 'local';
	rootName: string;
	rootDisplay?: string;
	fileCount: number;
	sampledFileCount: number;
	skippedCount: number;
	linkedHomes?: {
		local?: LocalProjectHome;
		cloud?: {
			rootName?: string;
			cloudPath: string;
			workspaceId?: string;
			importedBytes?: number;
		};
	};
} {
	// The bridge workspace carries the displayable root path; persist it so the
	// desk agent prompt can state the actual working directory instead of leaving
	// the model to probe (git) or claim it has no filesystem path.
	const rootDisplay = String(workspace?.rootDisplay ?? '').trim();
	const localHome = localHomeFromWorkspace(workspace, digest.rootName);
	const linkedHomes = linkedHomesFromSource(previousSource, {
		...(localHome ? { local: localHome } : {})
	});
	return {
		kind: 'local',
		rootName: digest.rootName,
		...(rootDisplay ? { rootDisplay } : {}),
		fileCount: digest.fileCount,
		sampledFileCount: digest.sampledFileCount,
		skippedCount: digest.skippedCount,
		...(hasLinkedHomes(linkedHomes) ? { linkedHomes } : {})
	};
}

export function githubProjectContextSource(clone: {
	repo?: string;
	cloned?: string;
	branch?: string;
	dest?: string;
}): {
	kind: 'github';
	rootName: string;
	repo: string;
	branch: string;
	cloudPath?: string;
} {
	const repo = String(clone.repo ?? clone.cloned ?? '').trim();
	const branch = String(clone.branch ?? 'default').trim() || 'default';
	const cloudPath = String(clone.dest ?? '').trim();

	return {
		kind: 'github',
		rootName: repo,
		repo,
		branch,
		...(cloudPath ? { cloudPath } : {})
	};
}

export async function bindLocalWorkspaceToFolder(
	token: string,
	folderId: string,
	folder?: any
): Promise<any | null> {
	const bridge = getEnosDesktopBridge();
	if (!bridge?.bindWorkspaceToFolder || !bridge?.buildProjectDigest || !folderId) return null;

	const ws = await bridge.bindWorkspaceToFolder(folderId);
	if (!ws) return null;

	return saveLocalWorkspaceSource(token, folderId, folder, ws);
}

async function saveLocalWorkspaceSource(
	token: string,
	folderId: string,
	folder: any,
	workspace: any
): Promise<any | null> {
	const bridge = getEnosDesktopBridge();
	if (!bridge?.buildProjectDigest || !folderId) return null;

	const digest = await bridge.buildProjectDigest(folderId);
	const nextData = {
		...(folder?.data ?? {}),
		project_context_digest: digest.text,
		project_context_updated_at: digest.generatedAt,
		project_context_source: projectContextSourceFromDigest(
			digest,
			workspace,
			folder?.data?.project_context_source
		)
	};

	const updated = await updateFolderById(token, folderId, { data: nextData });
	return {
		...(folder ?? {}),
		...(updated ?? {}),
		id: folderId,
		data: nextData
	};
}

export async function restoreLocalWorkspaceToFolder(
	token: string,
	folderId: string,
	folder?: any
): Promise<any | null> {
	const bridge = getEnosDesktopBridge();
	if (!bridge?.getWorkspace || !bridge?.buildProjectDigest || !folderId) return null;

	const ws = await bridge.getWorkspace(folderId);
	if (!ws?.rootDisplay) return null;
	return saveLocalWorkspaceSource(token, folderId, folder, ws);
}

export async function chooseLocalWorkspaceForFolder(
	token: string,
	folderId: string,
	folder?: any
): Promise<any | null> {
	const bridge = getEnosDesktopBridge();
	if (!bridge?.chooseWorkspaceForFolder || !bridge?.buildProjectDigest || !folderId) return null;

	const ws = await bridge.chooseWorkspaceForFolder(folderId);
	if (!ws?.rootDisplay) return null;
	return saveLocalWorkspaceSource(token, folderId, folder, ws);
}

export async function bindGithubRepoToFolder(
	token: string,
	folderId: string,
	folder: any,
	clone: { cloned: string; branch: string; dest: string }
): Promise<any | null> {
	if (!folderId) return null;

	const nextData = {
		...(folder?.data ?? {}),
		project_context_source: githubProjectContextSource(clone)
	};

	const updated = await updateFolderById(token, folderId, { data: nextData });
	return {
		...(folder ?? {}),
		...(updated ?? {}),
		id: folderId,
		data: nextData
	};
}
