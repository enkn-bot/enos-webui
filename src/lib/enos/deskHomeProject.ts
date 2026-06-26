const DESK_HOME_PROJECT_NAME = 'ENOS';

type DeskHomeProject = {
	name?: string | null;
	data?: {
		project_context_source?: {
			kind?: unknown;
		} | null;
	} | null;
	[key: string]: unknown;
};

export const isDuplicateDeskHomeProjectName = (name: string | null | undefined): boolean =>
	/^ENOS\s+\d+$/i.test(String(name ?? '').trim());

export const isFolderAlreadyExistsError = (error: unknown): boolean => {
	const message =
		typeof error === 'string'
			? error
			: error instanceof Error
				? error.message
				: typeof (error as { detail?: unknown })?.detail === 'string'
					? String((error as { detail: string }).detail)
					: String(error ?? '');
	return /folder already exists/i.test(message);
};

const isCloudRunnable = (folder: DeskHomeProject): boolean => {
	const kind = folder?.data?.project_context_source?.kind;
	return kind === 'cloud' || kind === 'github';
};

export const selectDeskHomeProject = <T extends DeskHomeProject>(
	folders: T[] | null | undefined
): T | null => {
	const list = Array.isArray(folders) ? folders : [];
	return (
		list.find((folder) => String(folder?.name ?? '').trim() === DESK_HOME_PROJECT_NAME) ??
		list.find((folder) => isCloudRunnable(folder)) ??
		list[0] ??
		null
	);
};
