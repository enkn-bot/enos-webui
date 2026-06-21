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
		pool.push(withName('Good morning.'), withName('Good morning.'), 'Ready when you are.');
	} else if (hour >= 12 && hour < 17) {
		pool.push(withName('Good afternoon.'), withName("How's your day?"), withName('Good afternoon.'));
	} else if (hour >= 17 && hour < 22) {
		pool.push(withName('Good evening.'), withName('Evening.'), withName('Good evening.'));
	} else {
		pool.push('Hello, night owl.', withName("What's on your mind tonight?"), 'Burning the midnight oil?');
	}

	if (day === 5) pool.push(withName('That Friday feeling.'), withName('Happy Friday!'));
	if (day === 6 || day === 0) {
		pool.push(withName('Welcome to the weekend.'), withName(`Happy ${day === 6 ? 'Saturday!' : 'Sunday!'}`));
	}
	pool.push(withName('Welcome.'), name ? `${name} returns!` : 'Welcome back!', withName('Back at it.'));

	const roll = Number(rng());
	const idx = Math.min(
		pool.length - 1,
		Math.max(0, Math.floor((Number.isFinite(roll) ? roll : 0) * pool.length))
	);
	return pool[idx];
}
