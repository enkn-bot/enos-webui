export const normalizeChatTitleEventData = (data: unknown) => {
	if (typeof data === 'string') {
		return data.trim();
	}

	if (
		data &&
		typeof data === 'object' &&
		'title' in data &&
		typeof (data as { title?: unknown }).title === 'string'
	) {
		return (data as { title: string }).title.trim();
	}

	return '';
};
