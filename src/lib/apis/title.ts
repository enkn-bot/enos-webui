/**
 * Extract a chat title from a task-model completion.
 *
 * The title task template asks the model for `{ "title": "..." }` JSON, and
 * when the model obeys we use that. But some task models — notably ENOS's
 * `gemini-2.5-flash-lite` title lane — answer with a bare title STRING instead
 * of JSON. The server-side (socket) auto-title path handles that leniently, so
 * enoschat titles fine; the client-side title path (project/desk chats, and the
 * manual "regenerate title" action) used a strict JSON-only parse and returned
 * `null` on a plain-text title — leaving those chats stuck on "New Chat".
 *
 * This parser accepts BOTH shapes: the requested JSON first, then a cleaned
 * plain-text fallback. It deliberately returns `null` (rather than a bad title)
 * for sentence-length prose, refusals, or raw JSON fragments.
 */
export const parseGeneratedTitle = (content: string): string | null => {
	const response = String(content ?? '');

	// Derive a usable title from a plain-text response.
	const cleanPlainTitle = (text: string): string | null => {
		let t = String(text ?? '').trim();
		if (!t) return null;
		t = t
			.replace(/^```[a-zA-Z]*\s*/, '')
			.replace(/\s*```$/, '')
			.trim(); // strip code fences
		t = (t.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '').trim(); // first non-empty line
		t = t.replace(/^\s*title\s*[:\-]\s*/i, '').trim(); // strip a leading "Title:" label
		t = t.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim(); // strip wrapping quotes
		if (!t) return null;
		if (/^[{[]/.test(t)) return null; // looks like (broken) JSON, not a title
		if (t.length > 100) return null; // sentence-length prose / refusal, not a title
		return t;
	};

	try {
		// Fix common JSON format issues (single quotes / backticks) before parsing.
		const sanitizedResponse = response.replace(/['‘’`]/g, '"');

		const jsonStartIndex = sanitizedResponse.indexOf('{');
		const jsonEndIndex = sanitizedResponse.lastIndexOf('}');

		if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
			const jsonResponse = sanitizedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
			const parsed = JSON.parse(jsonResponse);
			if (parsed && parsed.title) {
				return String(parsed.title);
			}
			// JSON without a usable title key — try the plain-text form.
			return cleanPlainTitle(response);
		}

		// No JSON block: the model answered with a bare title string.
		return cleanPlainTitle(response);
	} catch (e) {
		// Parsing failed — still try to salvage a plain-text title.
		console.error('Failed to parse response: ', e);
		return cleanPlainTitle(response);
	}
};
