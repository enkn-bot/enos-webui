const normalize = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const deskChatTitleLabel = ({
	title,
	chatTitle,
	fallback
}: {
	title?: unknown;
	chatTitle?: unknown;
	fallback: string;
}) => normalize(title) || normalize(chatTitle) || fallback;

export const deskTitlePathLabel = ({
	projectName,
	chatName
}: {
	projectName?: unknown;
	chatName: string;
}) => {
	const project = normalize(projectName);
	return project ? `${project} / ${chatName}` : chatName;
};
