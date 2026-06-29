// Terminal appearance shared by XTerminal (cloud/configured) and LocalTerminal
// (local shell). Follows the app's light/dark mode: light background + dark text
// in light mode, dark background + light text in dark mode — matches the sidepane.
// Uses the app's loaded mono face (`JetBrainsMono`, exposed via --font-mono).

const isDark = (): boolean =>
	typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

// Resolve a CSS custom property to its computed value so xterm (canvas-based)
// gets a concrete color string rather than an unresolved CSS var.
const resolveVar = (cssVar: string, fallback: string): string => {
	if (typeof document === 'undefined') return fallback;
	try {
		const probe = document.createElement('div');
		probe.style.display = 'none';
		probe.style.color = `var(${cssVar})`;
		document.body.appendChild(probe);
		const value = getComputedStyle(probe).color;
		probe.remove();
		return value || fallback;
	} catch {
		return fallback;
	}
};

export const resolveTerminalFont = (): string => {
	if (typeof document === 'undefined') {
		return "'JetBrainsMono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
	}
	try {
		const value = getComputedStyle(document.documentElement)
			.getPropertyValue('--font-mono')
			.trim();
		return value || "'JetBrainsMono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
	} catch {
		return "'JetBrainsMono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
	}
};

const DARK_THEME = {
	foreground: '#d4d4d4',
	cursor: '#d4d4d4',
	cursorAccent: '#1f1f1f',
	selectionBackground: '#3a3d41',
	selectionForeground: '#ffffff',
	black: '#1f1f1f',
	red: '#e06c75',
	green: '#98c379',
	yellow: '#e5c07b',
	blue: '#61afef',
	magenta: '#c678dd',
	cyan: '#56b6c2',
	white: '#abb2bf',
	brightBlack: '#5c6370',
	brightRed: '#e06c75',
	brightGreen: '#98c379',
	brightYellow: '#e5c07b',
	brightBlue: '#61afef',
	brightMagenta: '#c678dd',
	brightCyan: '#56b6c2',
	brightWhite: '#ffffff'
};

const LIGHT_THEME = {
	foreground: '#383a42',
	cursor: '#383a42',
	cursorAccent: '#ffffff',
	selectionBackground: '#e5e5e6',
	selectionForeground: '#383a42',
	black: '#383a42',
	red: '#e45649',
	green: '#50a14f',
	yellow: '#c18401',
	blue: '#4078f2',
	magenta: '#a626a4',
	cyan: '#0184bc',
	white: '#a0a1a7',
	brightBlack: '#a0a1a7',
	brightRed: '#e45649',
	brightGreen: '#50a14f',
	brightYellow: '#c18401',
	brightBlue: '#4078f2',
	brightMagenta: '#a626a4',
	brightCyan: '#0184bc',
	brightWhite: '#383a42'
};

// Follows the app's light/dark mode. Dark mode: pane-surface gray-850 background.
// Light mode: white background matching the sidepane.
export const resolveTerminalTheme = () => {
	if (isDark()) {
		return { background: resolveVar('--color-gray-850', '#1f1f1f'), ...DARK_THEME };
	}
	return { background: '#ffffff', ...LIGHT_THEME };
};
