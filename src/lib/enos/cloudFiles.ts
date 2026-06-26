export const CLOUD_FILES_DEFAULT_PATH = '/home/user/';

const withTrailingSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

const normalizeCloudPath = (path: string | null | undefined) => path?.replace(/\\/g, '/').trim();

export const resolveCloudProjectRoot = (
	source:
		| {
				kind?: unknown;
				cloudPath?: unknown;
				dest?: unknown;
		  }
		| null
		| undefined
): string | null => {
	const kind = source?.kind;
	if (kind !== 'cloud' && kind !== 'github') return null;

	const root = normalizeCloudPath(
		typeof source?.cloudPath === 'string'
			? source.cloudPath
			: typeof source?.dest === 'string'
				? source.dest
				: null
	);
	if (!root || root === '/') return null;
	return withTrailingSlash(root);
};

export const resolveCloudFilesInitialPath = (
	rawCwd: string | null | undefined,
	projectRoot: string | null | undefined = null
) => {
	const cwd = rawCwd?.replace(/\\/g, '/').trim();
	const root = normalizeCloudPath(projectRoot);
	const normalizedRoot = root && root !== '/' ? withTrailingSlash(root) : null;

	if (normalizedRoot) {
		if (!cwd || cwd === '/' || cwd === CLOUD_FILES_DEFAULT_PATH.replace(/\/$/, '')) {
			return normalizedRoot;
		}

		const normalizedCwd = withTrailingSlash(cwd);
		if (normalizedCwd.startsWith(normalizedRoot)) {
			return normalizedCwd;
		}

		return normalizedRoot;
	}

	if (!cwd || cwd === '/') return CLOUD_FILES_DEFAULT_PATH;
	return withTrailingSlash(cwd);
};

export const formatCloudFilesStatus = (workspaceName: string | null | undefined) => {
	const name = workspaceName?.trim();
	const label = name === 'Cloud Workspace' ? 'ENOS Cloud' : name;
	return label ? `Working in ENOS Cloud · ${label}` : 'Working in ENOS Cloud';
};
