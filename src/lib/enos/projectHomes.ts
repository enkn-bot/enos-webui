export type LocalProjectHome = {
	rootName?: string;
	rootDisplay: string;
	selectedAt?: string | null;
};

export type CloudProjectHome = {
	rootName?: string;
	cloudPath: string;
	workspaceId?: string;
	importedBytes?: number;
};

export type LinkedProjectHomes = {
	local?: LocalProjectHome;
	cloud?: CloudProjectHome;
};

type ProjectSourceLike = {
	kind?: unknown;
	rootName?: unknown;
	rootDisplay?: unknown;
	cloudPath?: unknown;
	workspaceId?: unknown;
	importedBytes?: unknown;
	linkedHomes?: {
		local?: Partial<LocalProjectHome> | null;
		cloud?: Partial<CloudProjectHome> | null;
	} | null;
};

const cleanString = (value: unknown): string | null => {
	const text = typeof value === 'string' ? value.trim() : '';
	return text ? text : null;
};

const cleanNumber = (value: unknown): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;

export const localHomeFromWorkspace = (
	workspace: { name?: unknown; rootDisplay?: unknown; selectedAt?: unknown } | null | undefined,
	fallbackRootName?: unknown
): LocalProjectHome | null => {
	const rootDisplay = cleanString(workspace?.rootDisplay);
	if (!rootDisplay) return null;

	const rootName = cleanString(workspace?.name) ?? cleanString(fallbackRootName);
	const selectedAt = cleanString(workspace?.selectedAt);
	return {
		...(rootName ? { rootName } : {}),
		rootDisplay,
		...(selectedAt ? { selectedAt } : {})
	};
};

export const localHomeFromSource = (
	source: ProjectSourceLike | null | undefined
): LocalProjectHome | null => {
	const linked = source?.linkedHomes?.local ?? null;
	const linkedRoot = cleanString(linked?.rootDisplay);
	if (linkedRoot) {
		const rootName = cleanString(linked?.rootName) ?? cleanString(source?.rootName);
		const selectedAt = cleanString(linked?.selectedAt);
		return {
			...(rootName ? { rootName } : {}),
			rootDisplay: linkedRoot,
			...(selectedAt ? { selectedAt } : {})
		};
	}

	if (source?.kind !== 'local') return null;
	const rootDisplay = cleanString(source?.rootDisplay);
	if (!rootDisplay) return null;
	const rootName = cleanString(source?.rootName);
	return {
		...(rootName ? { rootName } : {}),
		rootDisplay
	};
};

export const cloudHomeFromSource = (
	source: ProjectSourceLike | null | undefined
): CloudProjectHome | null => {
	const linked = source?.linkedHomes?.cloud ?? null;
	const linkedPath = cleanString(linked?.cloudPath);
	if (linkedPath) {
		const rootName = cleanString(linked?.rootName) ?? cleanString(source?.rootName);
		const workspaceId = cleanString(linked?.workspaceId);
		const importedBytes = cleanNumber(linked?.importedBytes);
		return {
			...(rootName ? { rootName } : {}),
			cloudPath: linkedPath,
			...(workspaceId ? { workspaceId } : {}),
			...(importedBytes != null ? { importedBytes } : {})
		};
	}

	if (source?.kind !== 'cloud' && source?.kind !== 'github') return null;
	const cloudPath = cleanString(source?.cloudPath);
	if (!cloudPath) return null;
	const rootName = cleanString(source?.rootName);
	const workspaceId = cleanString(source?.workspaceId);
	const importedBytes = cleanNumber(source?.importedBytes);
	return {
		...(rootName ? { rootName } : {}),
		cloudPath,
		...(workspaceId ? { workspaceId } : {}),
		...(importedBytes != null ? { importedBytes } : {})
	};
};

export const linkedHomesFromSource = (
	source: ProjectSourceLike | null | undefined,
	additions: LinkedProjectHomes = {}
): LinkedProjectHomes => {
	const local = additions.local ?? localHomeFromSource(source);
	const cloud = additions.cloud ?? cloudHomeFromSource(source);
	return {
		...(local ? { local } : {}),
		...(cloud ? { cloud } : {})
	};
};

export const hasLinkedHomes = (homes: LinkedProjectHomes): boolean =>
	Boolean(homes.local || homes.cloud);

export const projectSourceFromCloudHome = (
	home: CloudProjectHome,
	previousSource?: ProjectSourceLike | null
) => {
	const rootName = home.rootName ?? cleanString(previousSource?.rootName) ?? 'ENOS Cloud project';
	const linkedHomes = linkedHomesFromSource(previousSource, {
		cloud: {
			rootName,
			cloudPath: home.cloudPath,
			...(home.workspaceId ? { workspaceId: home.workspaceId } : {}),
			...(home.importedBytes != null ? { importedBytes: home.importedBytes } : {})
		}
	});

	return {
		kind: 'cloud',
		rootName,
		cloudPath: home.cloudPath,
		...(home.workspaceId ? { workspaceId: home.workspaceId } : {}),
		...(home.importedBytes != null ? { importedBytes: home.importedBytes } : {}),
		...(hasLinkedHomes(linkedHomes) ? { linkedHomes } : {})
	};
};
