// Temporal grounding for ENOS surfaces. The browser knows the user's real
// local time and timezone, so Desk grounding is more accurate than anything the
// server could infer. Kept tiny and pure so it is trivially testable.

const GROUNDING_PREFIX = 'Current date and time:';

/**
 * A one-line statement of the present moment in the user's local timezone,
 * e.g. "Current date and time: Friday, June 19, 2026 at 2:05 PM EDT. ..."
 */
export const groundingLine = (now: Date = new Date()): string => {
	let stamp: string;
	try {
		stamp = new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		}).format(now);
	} catch {
		// Environments without full Intl support still get a usable timestamp.
		stamp = now.toString();
	}
	return (
		`${GROUNDING_PREFIX} ${stamp}. ` +
		'Treat this as the present moment for any time-relative reasoning ' +
		'(today, this week, the current year, how recent something is). ' +
		'Never say you do not know the current date or year.'
	);
};

export const deskSurfaceGroundingLine = (args: {
	projectName?: string | null;
	location?: 'local' | 'cloud' | null;
	hasProject?: boolean;
	readOnly?: boolean;
}): string => {
	const projectName = String(args.projectName ?? '').trim();

	if (!args.hasProject) {
		return (
			'Surface: ENOS Desk; no project is selected. This is a chat-only Desk ' +
			'conversation, not a terminal. Project files, local tools, and cloud workspace ' +
			'actions are inactive until the user selects or creates a project.'
		);
	}

	const location =
		args.location === 'cloud'
			? 'cloud'
			: args.location === 'local'
				? 'your device'
				: args.readOnly
					? 'read-only history'
					: 'no active workspace';
	const project = projectName || 'the selected project';

	return `Surface: ENOS Desk. Active project: ${project}. Working in ${location}.`;
};
