<script>
	import DOMPurify from 'dompurify';

	// The ONE generative-UI supplement. The model writes semantic HTML; we
	// sanitize it hard (no script / JS / inline handlers / inline styles) and
	// impose the ENOS theme-aware wrapper so it is beautiful & consistent every
	// time, light or dark. Structure = model's; 100% of styling = ours.

	/** @type {string} */
	export let html = '';
	/** @type {boolean} — fence still open (block still streaming) */
	export let streaming = false;

	// Hard sanitize: strip every script vector AND the model's own styling so it
	// can never fight our tokens. class stays (our vocabulary: pill, grid3, q…).
	const clean = (raw) =>
		DOMPurify.sanitize(raw ?? '', {
			FORBID_TAGS: ['script', 'style', 'iframe', 'link', 'meta', 'object', 'embed', 'form'],
			FORBID_ATTR: ['style', 'srcset', 'onerror', 'onload'],
			ALLOW_DATA_ATTR: false
		});

	$: safe = streaming ? '' : clean(html);
</script>

<div class="enos-html">
	{#if streaming || !safe}
		<div class="shim"><div class="label">Generating…</div></div>
	{:else}
		<div class="content reveal">{@html safe}</div>
	{/if}
</div>

<style>
	/* ---- ENOS theme tokens (the wrapper OWNS these; AI HTML never sets them) ---- */
	.enos-html {
		--eh-fg: #1a1a1a;
		--eh-muted: #6b7280;
		--eh-card: #ffffff;
		--eh-bg: #ffffff;
		--eh-border: rgba(17, 17, 17, 0.1);
		--eh-chip: #f3f4f6;
		--eh-accent: #e07a3f;
		--eh-shim1: rgba(0, 0, 0, 0.04);
		--eh-shim2: rgba(0, 0, 0, 0.09);
		--eh-serif: 'Iowan Old Style', 'Palatino', Georgia, serif;

		border: 1px solid var(--eh-border);
		border-radius: 18px;
		background: var(--eh-card);
		overflow: hidden;
		margin: 14px 0;
		max-width: 680px;
		transition:
			background 0.25s,
			border-color 0.25s;
	}
	:global(.dark) .enos-html {
		--eh-fg: #f4f4f5;
		--eh-muted: #8b8b93;
		--eh-card: #161619;
		--eh-bg: #0e0e10;
		--eh-border: rgba(255, 255, 255, 0.1);
		--eh-chip: #1f1f24;
		--eh-accent: #e8935e;
		--eh-shim1: rgba(255, 255, 255, 0.05);
		--eh-shim2: rgba(255, 255, 255, 0.11);
	}

	.content {
		padding: 22px 24px;
		/* The message container is .markdown-prose (white-space: pre-line), which would
		   turn every newline/indent in the model's pretty-printed HTML into a rendered
		   blank line — huge phantom gaps. This is HTML, not preformatted text: collapse
		   source whitespace so layout is driven purely by our CSS. THE fix for airiness. */
		white-space: normal;
	}

	/* The model sometimes wraps the WHOLE block in a single container div (often
	   class="q"). That would create a second frame inside our wrapper — neutralize
	   any lone top-level wrapper so we always show exactly ONE frame. Real nested
	   question cards (.q inside content) keep their styling. */
	.content > :global(div:only-child),
	.content > :global(.q:only-child) {
		border: 0;
		padding: 0;
		margin: 0;
		background: transparent;
		border-radius: 0;
	}

	/* ---- our stylesheet themes the semantic tags the model writes ---- */
	.content :global(h1),
	.content :global(h2),
	.content :global(h3),
	.content :global(h4) {
		font-family: var(--eh-serif);
		color: var(--eh-fg);
		margin: 0.2em 0 0.5em;
		line-height: 1.2;
	}
	.content :global(h2) {
		font-size: 22px;
	}
	.content :global(h3) {
		font-size: 16px;
	}
	.content :global(p) {
		color: var(--eh-fg);
		line-height: 1.6;
		margin: 0.4em 0;
	}
	.content :global(.lead) {
		color: var(--eh-muted);
		font-style: italic;
		margin-top: -2px;
	}
	.content :global(a) {
		color: var(--eh-accent);
		text-decoration: none;
	}
	.content :global(a:hover) {
		text-decoration: underline;
	}
	.content :global(ol),
	.content :global(ul) {
		padding-left: 20px;
		line-height: 1.7;
		margin: 0.4em 0;
		color: var(--eh-fg);
	}
	.content :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
		margin: 0.3em 0;
	}
	.content :global(th) {
		text-align: left;
		color: var(--eh-muted);
		font-weight: 600;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 8px 10px;
		border-bottom: 1px solid var(--eh-border);
	}
	.content :global(td) {
		padding: 9px 10px;
		border-bottom: 1px solid var(--eh-border);
		vertical-align: top;
		color: var(--eh-fg);
	}
	.content :global(tr:last-child td) {
		border-bottom: 0;
	}
	.content :global(.pills) {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin: 0.5em 0;
	}
	.content :global(.pill) {
		display: inline-block;
		background: var(--eh-chip);
		color: var(--eh-muted);
		border-radius: 999px;
		padding: 3px 10px;
		font-size: 12px;
		margin: 2px 4px 2px 0;
	}
	/* Even if the model stacks each pill in its own block, keep them on one row. */
	.content :global(.pills .pill) {
		margin: 0;
	}
	.content :global(.grid3) {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.content :global(.grid2) {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 8px;
	}
	.content :global(img) {
		max-width: 100%;
		border-radius: 12px;
		display: block;
	}
	.content :global(.q) {
		border: 1px solid var(--eh-border);
		border-radius: 12px;
		padding: 12px 14px;
		margin: 8px 0;
		background: var(--eh-bg);
	}
	.content :global(.q b) {
		color: var(--eh-accent);
	}
	/* Kill airiness the model sometimes injects: empty spacer elements + stray
	   top/bottom margins on the first/last child of any card. Keeps blocks compact
	   and mockup-tight regardless of how the model spaces its HTML. */
	.content :global(p:empty),
	.content :global(div:empty:not(.pill)) {
		display: none;
	}
	.content :global(.q > :first-child),
	.content :global(.content > :first-child) {
		margin-top: 0;
	}
	.content :global(.q > :last-child) {
		margin-bottom: 0;
	}
	.content :global(blockquote) {
		border-left: 3px solid var(--eh-accent);
		margin: 0.5em 0;
		padding: 0.2em 0 0.2em 14px;
		color: var(--eh-muted);
	}
	.content :global(code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9em;
		background: var(--eh-chip);
		padding: 1px 5px;
		border-radius: 6px;
	}

	/* ---- LOADING SHIMMER (Gemini-style): pulsing sweeping gradient ---- */
	.shim {
		height: 220px;
		position: relative;
		background: linear-gradient(
			100deg,
			var(--eh-shim1) 30%,
			var(--eh-shim2) 50%,
			var(--eh-shim1) 70%
		);
		background-size: 200% 100%;
		animation: eh-sweep 1.5s ease-in-out infinite;
	}
	.shim .label {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--eh-serif);
		font-size: 18px;
		color: var(--eh-muted);
		animation: eh-pulse 1.6s ease-in-out infinite;
	}
	@keyframes eh-sweep {
		0% {
			background-position: 180% 0;
		}
		100% {
			background-position: -80% 0;
		}
	}
	@keyframes eh-pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 0.95;
		}
	}
	.reveal {
		animation: eh-fade 0.5s ease;
	}
	@keyframes eh-fade {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
