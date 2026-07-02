/* Empty-state welcome greeting. Pure and deterministic given `rng`; callers
   should call once per mount so the greeting never changes during rendering. */
export function composeWelcomeGreeting(
	date = new Date(),
	firstName = '',
	rng: () => number = Math.random
): string {
	const name = String(firstName || '').trim();
	const withName = (text: string) => {
		if (!name) return text;
		const match = String(text || '').match(/^(.+?)([.!?])?$/);
		if (!match) return text;
		const [, body, punctuation] = match;
		return punctuation ? `${body}, ${name}${punctuation}` : `${body}, ${name}`;
	};
	const hour = date.getHours();
	const day = date.getDay();
	const pool: string[] = [];

	if (hour >= 5 && hour < 12) {
		pool.push(withName('Good morning.'), 'What needs attention?', 'Ready when you are.');
	} else if (hour >= 12 && hour < 17) {
		pool.push(withName('Good afternoon.'), 'Where should we start?', 'What needs attention?');
	} else if (hour >= 17 && hour < 22) {
		pool.push(
			withName('Good evening.'),
			'What are we advancing?',
			'Evening. What needs attention?'
		);
	} else {
		pool.push(
			'Late session. What needs attention?',
			'Quiet hours. What are we advancing?',
			'Still here. What are we working on?'
		);
	}

	if (day === 5) pool.push('Friday checkpoint.', 'What should we close before tomorrow?');
	if (day === 6 || day === 0) {
		pool.push('Weekend session.', 'What should we move forward?');
	}
	pool.push(withName('Welcome back.'), 'Back at it.', 'What needs attention?');

	const roll = Number(rng());
	const idx = Math.min(
		pool.length - 1,
		Math.max(0, Math.floor((Number.isFinite(roll) ? roll : 0) * pool.length))
	);
	return pool[idx];
}
