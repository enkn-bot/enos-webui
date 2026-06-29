const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

export const normalizeUrl = (input: string): string | null => {
	const trimmed = input.trim();
	if (!trimmed) return null;
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	const scheme = LOCAL_HOST.test(trimmed) ? 'http' : 'https';
	return `${scheme}://${trimmed}`;
};
