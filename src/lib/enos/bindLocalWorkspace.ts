import { updateFolderById } from '$lib/apis/folders';
import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';

export function projectContextSourceFromDigest(digest: any): {
	kind: 'local';
	rootName: string;
	fileCount: number;
	sampledFileCount: number;
	skippedCount: number;
} {
	return {
		kind: 'local',
		rootName: digest.rootName,
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
		project_context_source: projectContextSourceFromDigest(digest)
	};

	const updated = await updateFolderById(token, folderId, { data: nextData });
	return {
		...(folder ?? {}),
		...(updated ?? {}),
		id: folderId,
		data: nextData
	};
}
