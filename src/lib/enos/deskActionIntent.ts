import { normalizeUrl } from '$lib/enos/browserUrl';

export type DeskActionIntent =
	| { kind: 'terminal-input'; input: string }
	| { kind: 'browser-url'; url: string }
	| { kind: 'files-open-path'; path: string };

const stripQuotes = (value: string) => {
	const trimmed = value.trim();
	if (
		trimmed.length >= 2 &&
		((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
			(trimmed.startsWith("'") && trimmed.endsWith("'")))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
};
const withNewline = (value: string) => (value.endsWith('\n') ? value : `${value}\n`);

const destructiveShellCommand = (command: string) =>
	/^\s*(sudo\s+)?rm\s+(-[^\s]*[rf]|.*\*)/i.test(command) ||
	/^\s*(mkfs|diskutil\s+erase|shutdown|reboot|halt|poweroff)\b/i.test(command);

const safeBareShellCommand = (command: string) =>
	/^\s*(echo|pwd|ls|date|whoami)\b/i.test(command) ||
	/^\s*git\s+(status|diff|log|show|branch)\b/i.test(command);

const terminalInputIntent = (command: string): DeskActionIntent | null => {
	const input = stripQuotes(command);
	if (!input || destructiveShellCommand(input)) return null;
	return { kind: 'terminal-input', input: withNewline(input) };
};

const browserUrlIntent = (prompt: string): DeskActionIntent | null => {
	const patterns = [
		/\b(?:open|load|go\s+to)\s+(\S+)\s+(?:in|on)\s+(?:the\s+)?(?:browser|web)\b/i,
		/\bnavigate\s+(?:the\s+)?browser\s+to\s+(\S+)/i,
		/\b(?:browser|web)\s+(?:open|load|go\s+to|navigate\s+to)\s+(\S+)/i
	];
	for (const pattern of patterns) {
		const match = prompt.match(pattern);
		const url = match?.[1] ? normalizeUrl(stripQuotes(match[1])) : null;
		if (url) return { kind: 'browser-url', url };
	}
	return null;
};

const fileOpenIntent = (prompt: string): DeskActionIntent | null => {
	const match = prompt.match(
		/^\s*(?:open|show|select|preview)\s+(.+?)\s+(?:in|on)\s+(?:the\s+)?(?:files?|file\s+(?:tab|pane|browser)|project\s+files?)\s*$/i
	);
	const path = match?.[1] ? stripQuotes(match[1]) : '';
	if (!path || /^https?:\/\//i.test(path)) return null;
	return { kind: 'files-open-path', path };
};

const terminalIntent = (prompt: string): DeskActionIntent | null => {
	const explicit = prompt.match(
		/^\s*(?:run|execute|send|type)\s+(.+?)\s+(?:in|to|into|on)\s+(?:the\s+)?(?:terminal|shell|console)\s*$/i
	);
	if (explicit?.[1]) return terminalInputIntent(explicit[1]);

	const terminalPrefix = prompt.match(/^\s*(?:terminal|shell|console)\s*[:,]\s*(.+?)\s*$/i);
	if (terminalPrefix?.[1]) return terminalInputIntent(terminalPrefix[1]);

	if (safeBareShellCommand(prompt)) return terminalInputIntent(prompt);
	return null;
};

export const deskActionIntentFromPrompt = (prompt = ''): DeskActionIntent | null => {
	const text = prompt.trim();
	if (!text) return null;
	return browserUrlIntent(text) ?? fileOpenIntent(text) ?? terminalIntent(text);
};
