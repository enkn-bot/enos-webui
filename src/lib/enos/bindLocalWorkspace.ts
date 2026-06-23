import { updateFolderById } from '$lib/apis/folders';
import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';

export function projectContextSourceFromDigest(
	digest: any,
	workspace?: any
): {
	kind: 'local';
	rootName: string;
	rootDisplay?: string;
	fileCount: number;
	sampledFileCount: number;
	skippedCount: number;
} {
	// The bridge workspace carries the displayable root path; persist it so the
	// desk agent prompt can state the actual working directory instead of leaving
	// the model to probe (git) or claim it has no filesystem path.
	const rootDisplay = String(workspace?.rootDisplay ?? '').trim();
	return {
		kind: 'local',
		rootName: digest.rootName,
		...(rootDisplay ? { rootDisplay } : {}),
		fileCount: digest.fileCount,
		sampledFileCount: digest.sampledFileCount,
		skippedCount: digest.skippedCount
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

	const digest = await bridge.buildProjectDigest(folderId);
	const nextData = {
		...(folder?.data ?? {}),
		project_context_digest: digest.text,
		project_context_updated_at: digest.generatedAt,
		project_context_source: projectContextSourceFromDigest(digest, ws)
	};

	const updated = await updateFolderById(token, folderId, { data: nextData });
	return {
		...(folder ?? {}),
		...(updated ?? {}),
		id: folderId,
		data: nextData
	};
}
