export const CLOUD_FILES_DEFAULT_PATH = '/home/user/';

const withTrailingSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

export const resolveCloudFilesInitialPath = (rawCwd: string | null | undefined) => {
	const cwd = rawCwd?.replace(/\\/g, '/').trim();
	if (!cwd || cwd === '/') return CLOUD_FILES_DEFAULT_PATH;
	return withTrailingSlash(cwd);
};

export const formatCloudFilesStatus = (workspaceName: string | null | undefined) => {
	const name = workspaceName?.trim();
	return name ? `Working in cloud workspace · ${name}` : 'Working in cloud workspace';
};
