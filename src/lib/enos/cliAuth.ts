export const isAllowedCliRedirect = (value: string) => {
	try {
		const url = new URL(value);
		return (
			url.protocol === 'http:' &&
			(url.hostname === '127.0.0.1' || url.hostname === 'localhost') &&
			url.pathname === '/callback' &&
			Boolean(url.port)
		);
	} catch {
		return false;
	}
};

export const buildCliAuthPost = ({
	redirect,
	state,
	token
}: {
	redirect: string;
	state: string;
	token: string;
}) => {
	if (!isAllowedCliRedirect(redirect)) {
		throw new Error('Unsafe CLI callback URL');
	}
	if (!state) {
		throw new Error('Missing CLI auth state');
	}
	const cleanToken = token.trim();
	if (!cleanToken) {
		throw new Error('Missing ENOS session token');
	}
	return {
		url: redirect,
		init: {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ state, token: cleanToken })
		}
	};
};
