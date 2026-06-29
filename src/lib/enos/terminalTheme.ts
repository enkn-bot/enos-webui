// The xterm surface should match the dock pane (dark:bg-gray-850), not pure
// black. We resolve the CSS variable at runtime so the value stays in sync
// with the theme; xterm accepts the browser-resolved rgb() string.
export const resolveTerminalBackground = (): string => {
	if (typeof document === 'undefined') return '#262626';
	try {
		const probe = document.createElement('div');
		probe.style.color = 'var(--color-gray-850)';
		probe.style.display = 'none';
		document.body.appendChild(probe);
		const rgb = getComputedStyle(probe).color;
		probe.remove();
		return rgb || '#262626';
	} catch {
		return '#262626';
	}
};
