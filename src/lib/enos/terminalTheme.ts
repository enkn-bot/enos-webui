// Terminal appearance shared by XTerminal (cloud/configured) and LocalTerminal
// (local shell). The terminal always uses a dark theme regardless of the app's
// light/dark mode — the Pi TUI renders with true-color ANSI codes calibrated for
// dark backgrounds, and this is the standard for coding terminals (VS Code, JetBrains).
// The chat surface adapts to light/dark; the terminal pane stays dark.
// We also use the app's loaded mono face (`JetBrainsMono`, exposed via --font-mono);
// the previous `'JetBrains Mono'` (with a space) did not match the @font-face.

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

// Terminal always dark — Pi TUI true-color codes assume a dark background.
export const resolveTerminalTheme = () => ({ background: '#1e1e1e', ...DARK_THEME });
