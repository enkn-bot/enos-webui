import type { EnosSurface } from '$lib/enos/surfaceScope';

export type DeskSurfaceLabelKind = 'new' | 'collection' | 'empty' | 'rename';

export const deskSurfaceLabel = (kind: DeskSurfaceLabelKind, surface: EnosSurface): string => {
	if (surface === 'desk') {
		if (kind === 'new') return 'New Session';
		if (kind === 'collection') return 'Sessions';
		if (kind === 'empty') return 'No sessions yet';
		if (kind === 'rename') return 'Rename session';
	}

	if (kind === 'new') return 'New Chat';
	if (kind === 'collection') return 'Chats';
	if (kind === 'empty') return 'No chats found';
	return 'Rename chat';
};

export const deskSessionTitle = (
	title: string | null | undefined,
	surface: EnosSurface
): string => {
	if (surface === 'desk' && (!title || title === 'New Chat')) {
		return 'New Session';
	}
	return title ?? '';
};
