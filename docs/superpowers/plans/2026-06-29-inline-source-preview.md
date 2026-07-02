# Inline Source Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clean Perplexity-style hover/focus previews to inline citation pills in assistant responses.

**Architecture:** Extract source normalization from `Citations.svelte` into a pure helper, pass normalized records through the Markdown renderer alongside the existing `sourceIds`, and make `Markdown/Source.svelte` render an anchored popover. The bottom response-level `Sources` control keeps its current behavior and uses the same helper to avoid duplicated citation reduction.

**Tech Stack:** Svelte 5, bits-ui `LinkPreview`, TypeScript helpers, Vitest, existing Tailwind utility classes.

---

## File Structure

- Create: `src/lib/enos/sourceCitations.ts`  
  Owns normalized citation records for both the bottom citations component and inline citation previews.
- Create: `src/lib/enos/sourceCitations.test.ts`  
  Unit coverage for normalization, dedupe, labels, URLs, snippets, and stable index order.
- Modify: `src/lib/components/chat/Messages/Citations.svelte`  
  Replaces local reduction logic with `buildEnosCitations(...)`.
- Modify: `src/lib/components/chat/Messages/ContentRenderer.svelte`  
  Builds `sourcePreviews` and passes them into `Markdown.svelte`.
- Modify: `src/lib/components/chat/Messages/Markdown.svelte`  
  Accepts `sourcePreviews` and passes them into `MarkdownTokens.svelte`.
- Modify: `src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte`  
  Propagates `sourcePreviews` through block and recursive render paths.
- Modify: `src/lib/components/chat/Messages/Markdown/MarkdownInlineTokens.svelte`  
  Propagates `sourcePreviews` into nested inline render paths and `SourceToken.svelte`.
- Modify: `src/lib/components/chat/Messages/Markdown/SourceToken.svelte`  
  Resolves token citation ids to normalized preview records and delegates popover rendering to `Source.svelte`.
- Modify: `src/lib/components/chat/Messages/Markdown/Source.svelte`  
  Renders the existing pill plus a reversible anchored preview.
- Modify: `src/lib/enos/deskUiSource.test.ts`  
  Adds structural guardrails for the new helper and inline preview wiring.

## Task 1: Extract Normalized Citation Helper

**Files:**

- Create: `src/lib/enos/sourceCitations.ts`
- Create: `src/lib/enos/sourceCitations.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `src/lib/enos/sourceCitations.test.ts`:

```ts
import { describe, expect, test } from 'vitest';

import { buildEnosCitations, getPreviewSnippet } from './sourceCitations';

describe('ENOS source citations', () => {
	test('normalizes persisted ENOS web sources into readable preview records', () => {
		const sources = [
			{
				source: { name: 'enos_web/news_search', url: 'enos_web/news_search' },
				document: ['Brazil beat Scotland 3-0 in a friendly match.'],
				metadata: [
					{
						source: 'enos_web/news_search',
						title: 'Brazil beat Scotland - BBC Sport',
						url: 'https://www.bbc.com/sport/football/example'
					}
				],
				distances: [0.82]
			}
		];

		expect(buildEnosCitations(sources)).toEqual([
			{
				id: 'https://www.bbc.com/sport/football/example',
				source: {
					name: 'Brazil beat Scotland - BBC Sport',
					url: 'https://www.bbc.com/sport/football/example'
				},
				document: ['Brazil beat Scotland 3-0 in a friendly match.'],
				metadata: [
					{
						source: 'enos_web/news_search',
						title: 'Brazil beat Scotland - BBC Sport',
						url: 'https://www.bbc.com/sport/football/example'
					}
				],
				distances: [0.82]
			}
		]);
	});

	test('dedupes documents that share the same citation URL', () => {
		const sources = [
			{
				source: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Who_Are_You' },
				document: ['Album page passage.', 'Personnel passage.'],
				metadata: [
					{ title: 'Who Are You - Wikipedia', source: 'https://en.wikipedia.org/wiki/Who_Are_You' },
					{ title: 'Who Are You - Wikipedia', source: 'https://en.wikipedia.org/wiki/Who_Are_You' }
				],
				distances: [0.91, 0.77]
			}
		];

		const citations = buildEnosCitations(sources);

		expect(citations).toHaveLength(1);
		expect(citations[0].source.name).toBe('Who Are You - Wikipedia');
		expect(citations[0].source.url).toBe('https://en.wikipedia.org/wiki/Who_Are_You');
		expect(citations[0].document).toEqual(['Album page passage.', 'Personnel passage.']);
		expect(citations[0].distances).toEqual([0.91, 0.77]);
	});

	test('returns a compact whitespace-normalized snippet', () => {
		expect(getPreviewSnippet(' Line one.\\n\\nLine two has more detail. ', 18)).toBe(
			'Line one. Line two...'
		);
		expect(getPreviewSnippet('', 18)).toBe('');
	});
});
```

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```bash
npm run test:frontend -- src/lib/enos/sourceCitations.test.ts
```

Expected: FAIL with an import error because `src/lib/enos/sourceCitations.ts` does not exist.

- [ ] **Step 3: Add the helper implementation**

Create `src/lib/enos/sourceCitations.ts`:

```ts
import { getEnosCitationId, getEnosCitationLabel, getEnosCitationUrl } from './sourceLabels';

export type EnosCitationRecord = {
	id: string;
	source: {
		id?: unknown;
		name: string;
		url?: string;
		embed_url?: unknown;
		[key: string]: unknown;
	};
	document: string[];
	metadata: any[];
	distances: number[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const documentsFor = (source: any): string[] =>
	Array.isArray(source?.document)
		? source.document.filter((item: unknown) => typeof item === 'string')
		: [];

export const getPreviewSnippet = (content: unknown, maxLength = 180): string => {
	if (typeof content !== 'string') return '';

	const text = content.replace(/\s+/g, ' ').trim();
	if (text.length <= maxLength) return text;

	return `${text.slice(0, maxLength).trimEnd()}...`;
};

export const buildEnosCitations = (
	sources: any[] | null | undefined,
	citationsEnabled = true
): EnosCitationRecord[] => {
	if (!citationsEnabled) return [];

	const citations: EnosCitationRecord[] = [];

	for (const rawSource of sources ?? []) {
		if (!isRecord(rawSource) || Object.keys(rawSource).length === 0) continue;

		const documents = documentsFor(rawSource);

		documents.forEach((document, index) => {
			const metadata = Array.isArray(rawSource.metadata) ? rawSource.metadata[index] : undefined;
			const distance = Array.isArray(rawSource.distances) ? rawSource.distances[index] : undefined;
			const id = getEnosCitationId(rawSource.source, metadata);
			const label = getEnosCitationLabel(rawSource.source, metadata);
			const url = getEnosCitationUrl(rawSource.source, metadata);
			const normalizedSource = {
				...(isRecord(rawSource.source) ? rawSource.source : {}),
				name: label,
				...(url ? { url } : {})
			};

			const existing = citations.find((citation) => citation.id === id);

			if (existing) {
				existing.document.push(document);
				if (metadata !== undefined) existing.metadata.push(metadata);
				if (typeof distance === 'number') existing.distances.push(distance);
				return;
			}

			citations.push({
				id,
				source: normalizedSource,
				document: [document],
				metadata: metadata !== undefined ? [metadata] : [],
				distances: typeof distance === 'number' ? [distance] : []
			});
		});
	}

	return citations;
};
```

- [ ] **Step 4: Run the helper test and verify it passes**

Run:

```bash
npm run test:frontend -- src/lib/enos/sourceCitations.test.ts
```

Expected: PASS for all tests in `sourceCitations.test.ts`.

- [ ] **Step 5: Commit the helper**

Run:

```bash
git add src/lib/enos/sourceCitations.ts src/lib/enos/sourceCitations.test.ts
git commit -m "feat: normalize source citations"
```

## Task 2: Reuse Helper In Existing Citation Modal Path

**Files:**

- Modify: `src/lib/components/chat/Messages/Citations.svelte`
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [ ] **Step 1: Write failing structural guardrails**

In `src/lib/enos/deskUiSource.test.ts`, update the existing `persisted ENOS web sources render real labels instead of raw tool ids` test so the citation assertions read:

```ts
const sourceCitations = read('src/lib/enos/sourceCitations.ts');

expect(contentRenderer).toContain("import { getEnosSourceIds } from '$lib/enos/sourceLabels';");
expect(contentRenderer).toContain('sourceIds = getEnosSourceIds');
expect(contentRenderer).not.toContain('source?.source?.name ?? id');
expect(sourceCitations).toContain("from './sourceLabels';");
expect(sourceCitations).toContain('getEnosCitationLabel');
expect(sourceCitations).toContain('getEnosCitationUrl');
expect(citations).toContain("import { buildEnosCitations } from '$lib/enos/sourceCitations';");
expect(citations).toContain('citations = buildEnosCitations(sources);');
```

- [ ] **Step 2: Run the guardrail test and verify it fails**

Run:

```bash
npm run test:frontend -- src/lib/enos/deskUiSource.test.ts
```

Expected: FAIL because `Citations.svelte` still imports label helpers directly and still contains local reduction logic.

- [ ] **Step 3: Refactor `Citations.svelte` to use the helper**

In `src/lib/components/chat/Messages/Citations.svelte`, replace the source label imports:

```ts
import { buildEnosCitations } from '$lib/enos/sourceCitations';
```

Replace the reactive citation reduction block with:

```ts
$: {
	citations = buildEnosCitations(sources);
	console.log('citations', citations);

	showRelevance = calculateShowRelevance(citations);
	showPercentage = shouldShowPercentage(citations);
}
```

Keep `calculateShowRelevance`, `shouldShowPercentage`, `showSourceModal`, `CitationModal`, and the existing bottom sources markup in place.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm run test:frontend -- src/lib/enos/sourceCitations.test.ts src/lib/enos/deskUiSource.test.ts
```

Expected: PASS. Existing modal behavior remains wired through `showSourceModal`.

- [ ] **Step 5: Commit the modal-path refactor**

Run:

```bash
git add src/lib/components/chat/Messages/Citations.svelte src/lib/enos/deskUiSource.test.ts
git commit -m "refactor: reuse normalized citations"
```

## Task 3: Pass Preview Records Through Markdown Rendering

**Files:**

- Modify: `src/lib/components/chat/Messages/ContentRenderer.svelte`
- Modify: `src/lib/components/chat/Messages/Markdown.svelte`
- Modify: `src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte`
- Modify: `src/lib/components/chat/Messages/Markdown/MarkdownInlineTokens.svelte`
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [ ] **Step 1: Add failing wiring tests**

In `src/lib/enos/deskUiSource.test.ts`, add a test:

```ts
test('inline source previews pass normalized citations through markdown renderers', () => {
	const contentRenderer = read('src/lib/components/chat/Messages/ContentRenderer.svelte');
	const markdown = read('src/lib/components/chat/Messages/Markdown.svelte');
	const markdownTokens = read('src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte');
	const inlineTokens = read(
		'src/lib/components/chat/Messages/Markdown/MarkdownInlineTokens.svelte'
	);

	expect(contentRenderer).toContain(
		"import { buildEnosCitations } from '$lib/enos/sourceCitations';"
	);
	expect(contentRenderer).toContain('sourcePreviews = buildEnosCitations');
	expect(contentRenderer).toContain('{sourcePreviews}');
	expect(markdown).toContain('export let sourcePreviews = [];');
	expect(markdown).toContain('{sourcePreviews}');
	expect(markdownTokens).toContain('export let sourcePreviews = [];');
	expect(markdownTokens).toContain('{sourcePreviews}');
	expect(inlineTokens).toContain('export let sourcePreviews = [];');
	expect(inlineTokens).toContain('<SourceToken {id} {token} {sourceIds} {sourcePreviews}');
});
```

- [ ] **Step 2: Run the wiring test and verify it fails**

Run:

```bash
npm run test:frontend -- src/lib/enos/deskUiSource.test.ts
```

Expected: FAIL because `sourcePreviews` is not yet declared or propagated.

- [ ] **Step 3: Update `ContentRenderer.svelte`**

Add the import:

```ts
import { buildEnosCitations } from '$lib/enos/sourceCitations';
```

Add the reactive value near `sourceIds`:

```ts
let sourcePreviews = [];
$: sourcePreviews = buildEnosCitations(
	sources,
	model?.info?.meta?.capabilities?.citations !== false
);
```

Pass it into `Markdown`:

```svelte
<Markdown
	{id}
	content={model?.info?.meta?.capabilities?.citations === false
		? replaceOutsideCode(content, (segment) =>
				segment.replace(/\s*(\[(?:\d+(?:#[^,\]\s]+)?(?:,\s*\d+(?:#[^,\]\s]+)?)*)\])+/g, '')
			)
		: content}
	{model}
	{save}
	{preview}
	{done}
	{editCodeBlock}
	{topPadding}
	{sourceIds}
	{sourcePreviews}
	{onSourceClick}
	{onTaskClick}
	{onSave}
	onUpdate={async (token) => {
		const { lang, text: code } = token;
		if (
			($settings?.detectArtifacts ?? true) &&
			(['html', 'svg'].includes(lang) || (lang === 'xml' && code.includes('svg'))) &&
			!$mobile &&
			$chatId
		) {
			await tick();
			showArtifacts.set(true);
			showControls.set(true);
		}
	}}
	onPreview={async (value) => {
		console.log('Preview', value);
		await artifactCode.set(value);
		await showControls.set(true);
		await showArtifacts.set(true);
		await showEmbeds.set(false);
	}}
/>
```

- [ ] **Step 4: Update `Markdown.svelte`**

Add the exported prop:

```ts
export let sourcePreviews = [];
```

Pass it into `MarkdownTokens`:

```svelte
<MarkdownTokens
	{tokens}
	{id}
	{done}
	{save}
	{preview}
	{paragraphTag}
	{editCodeBlock}
	{sourceIds}
	{sourcePreviews}
	{topPadding}
	{allowEmbeds}
	{onTaskClick}
	{onSourceClick}
	{onSave}
	{onUpdate}
	{onPreview}
/>
```

- [ ] **Step 5: Update `MarkdownTokens.svelte`**

Add the exported prop:

```ts
export let sourcePreviews = [];
```

For every `<svelte:self ...>` and every child renderer that already receives `{sourceIds}`, add `{sourcePreviews}` in the same prop group. The citation branch must pass both values:

```svelte
{:else if token.type === 'citation'}
	{#if (sourceIds ?? []).length > 0}
		<SourceToken {id} {token} {sourceIds} {sourcePreviews} onClick={onSourceClick} />
	{:else}
		<TextToken {token} {done} />
	{/if}
```

- [ ] **Step 6: Update `MarkdownInlineTokens.svelte`**

Add the exported prop:

```ts
export let sourcePreviews = [];
```

For every recursive `<svelte:self ...>` call, add `{sourcePreviews}`. Update the citation branch:

```svelte
{:else if token.type === 'citation'}
	{#if (sourceIds ?? []).length > 0}
		<SourceToken {id} {token} {sourceIds} {sourcePreviews} onClick={onSourceClick} />
	{:else}
		<TextToken {token} {done} />
	{/if}
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm run test:frontend -- src/lib/enos/deskUiSource.test.ts src/lib/enos/sourceCitations.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit renderer plumbing**

Run:

```bash
git add src/lib/components/chat/Messages/ContentRenderer.svelte src/lib/components/chat/Messages/Markdown.svelte src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte src/lib/components/chat/Messages/Markdown/MarkdownInlineTokens.svelte src/lib/enos/deskUiSource.test.ts
git commit -m "feat: pass inline source preview data"
```

## Task 4: Render Anchored Inline Source Preview

**Files:**

- Modify: `src/lib/components/chat/Messages/Markdown/Source.svelte`
- Modify: `src/lib/components/chat/Messages/Markdown/SourceToken.svelte`
- Modify: `src/lib/enos/deskUiSource.test.ts`

- [ ] **Step 1: Add failing inline preview guardrails**

In `src/lib/enos/deskUiSource.test.ts`, add:

```ts
test('inline source pills render anchored previews without changing modal fallback', () => {
	const source = read('src/lib/components/chat/Messages/Markdown/Source.svelte');
	const sourceToken = read('src/lib/components/chat/Messages/Markdown/SourceToken.svelte');

	expect(source).toContain("import { LinkPreview } from 'bits-ui';");
	expect(source).toContain('export let previewSources = [];');
	expect(source).toContain('openSourceLink');
	expect(source).toContain('onClick(preview.sourceId ?? id)');
	expect(source).toContain('LinkPreview.Content');
	expect(source).toContain('sideOffset={8}');
	expect(sourceToken).toContain('export let sourcePreviews = [];');
	expect(sourceToken).toContain('previewSourcesForToken');
	expect(sourceToken).toContain('extraCount={(token?.ids ?? []).length - 1}');
	expect(sourceToken).toContain('{previewSources}');
});
```

- [ ] **Step 2: Run the guardrail test and verify it fails**

Run:

```bash
npm run test:frontend -- src/lib/enos/deskUiSource.test.ts
```

Expected: FAIL because `Source.svelte` does not import `LinkPreview` and `SourceToken.svelte` does not pass preview records.

- [ ] **Step 3: Replace `SourceToken.svelte` grouping logic**

Update `src/lib/components/chat/Messages/Markdown/SourceToken.svelte` to remove its current grouped `LinkPreview` wrapper and delegate grouped preview rendering to `Source.svelte`:

```svelte
<script lang="ts">
	import Source from './Source.svelte';

	export let id;
	export let token;
	export let sourceIds = [];
	export let sourcePreviews = [];
	export let onClick: Function = () => {};

	const citationIndex = (identifier: string | number): number => {
		const raw = typeof identifier === 'string' ? identifier.split('#')[0] : identifier;
		const index = Number.parseInt(String(raw), 10);
		return Number.isFinite(index) ? index - 1 : -1;
	};

	const previewForIdentifier = (identifier: string | number) => {
		const index = citationIndex(identifier);
		const preview = sourcePreviews?.[index];
		return preview ? { ...preview, sourceId: identifier } : null;
	};

	const previewSourcesForToken = (identifiers: Array<string | number>) =>
		identifiers.map(previewForIdentifier).filter(Boolean);
</script>

{#if sourceIds}
	{@const identifiers = token.citationIdentifiers ?? token.ids ?? []}
	{#if (token?.ids ?? []).length === 1}
		{@const sourceNumber = token.ids[0]}
		{@const identifier = token.citationIdentifiers ? token.citationIdentifiers[0] : sourceNumber}
		{@const previewSources = previewSourcesForToken([identifier])}
		<Source id={identifier} title={sourceIds[sourceNumber - 1]} {previewSources} {onClick} />
	{:else}
		{@const sourceNumber = token.ids[0]}
		{@const identifier = token.citationIdentifiers ? token.citationIdentifiers[0] : sourceNumber}
		{@const previewSources = previewSourcesForToken(identifiers)}
		<Source
			id={identifier}
			title={sourceIds[sourceNumber - 1]}
			extraCount={(token?.ids ?? []).length - 1}
			{previewSources}
			{onClick}
		/>
	{/if}
{:else}
	<span>{token.raw}</span>
{/if}
```

- [ ] **Step 4: Replace `Source.svelte` with anchored preview UI**

Update `src/lib/components/chat/Messages/Markdown/Source.svelte`:

```svelte
<script lang="ts">
	import { getContext } from 'svelte';
	import { LinkPreview } from 'bits-ui';
	import { decodeString } from '$lib/utils';
	import { getPreviewSnippet } from '$lib/enos/sourceCitations';

	const i18n = getContext('i18n');

	export let id;
	export let title: string = 'N/A';
	export let extraCount = 0;
	export let previewSources = [];
	export let onClick: Function = () => {};

	let openPreview = false;

	function getDomain(url: string): string {
		const domain = url.replace('http://', '').replace('https://', '').split(/[/?#]/)[0];
		return domain.startsWith('www.') ? domain.slice(4) : domain;
	}

	const getDisplayTitle = (value: string) => {
		if (!value) return 'N/A';
		if (value.length > 30) return value.slice(0, 15) + '...' + value.slice(-10);
		return value;
	};

	function formattedTitle(value: string): string {
		return value.startsWith('http') ? getDomain(value) : value;
	}

	const sourceUrl = (preview: any): string => {
		const url = preview?.source?.url;
		return typeof url === 'string' && url.startsWith('http') ? url : '';
	};

	const sourceDomain = (preview: any): string => {
		const url = sourceUrl(preview);
		if (url) return getDomain(url);
		return typeof preview?.source?.name === 'string' ? preview.source.name : '';
	};

	const faviconUrl = (preview: any): string => {
		const url = sourceUrl(preview);
		return url ? `https://www.google.com/s2/favicons?sz=64&domain=${url}` : '/favicon.png';
	};

	const openSourceLink = (event: Event, preview: any) => {
		event.stopPropagation();
		const url = sourceUrl(preview);
		if (url) window.open(url, '_blank', 'noopener,noreferrer');
	};

	const decodedTitle = () => formattedTitle(decodeString(title));
</script>

{#if title !== 'N/A'}
	{#if previewSources.length > 0}
		<LinkPreview.Root openDelay={100} closeDelay={100} bind:open={openPreview}>
			<LinkPreview.Trigger>
				<button
					aria-label={$i18n.t('View source: {{title}}', { title: decodedTitle() })}
					class="text-[10px] w-fit translate-y-[2px] px-2 py-0.5 dark:bg-white/5 dark:text-white/80 dark:hover:text-white bg-gray-50 text-black/80 hover:text-black transition rounded-xl"
					on:click={() => {
						openPreview = !openPreview;
					}}
				>
					<span class="line-clamp-1">
						{getDisplayTitle(decodedTitle())}
						{#if extraCount > 0}
							<span class="dark:text-white/50 text-black/50">+{extraCount}</span>
						{/if}
					</span>
				</button>
			</LinkPreview.Trigger>
			<LinkPreview.Portal>
				<LinkPreview.Content
					class="z-[999] w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-2xl dark:border-gray-800 dark:bg-gray-900"
					align="start"
					strategy="fixed"
					sideOffset={8}
				>
					{#if previewSources.length > 1}
						<div
							class="flex h-11 items-center justify-end gap-2 border-b border-gray-100 px-3 text-sm font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400"
						>
							<div class="flex -space-x-1">
								{#each previewSources.slice(0, 3) as preview}
									<img
										src={faviconUrl(preview)}
										alt=""
										class="size-5 rounded-full border-2 border-white bg-white dark:border-gray-900"
										on:error={(event) => {
											event.currentTarget.src = '/favicon.png';
										}}
									/>
								{/each}
							</div>
							<span>
								{$i18n.t('{{COUNT}} sources', {
									COUNT: previewSources.length
								})}
							</span>
						</div>
					{/if}

					<div class="max-h-[22rem] overflow-y-auto">
						{#each previewSources as preview}
							<div
								class="grid w-full grid-cols-[2rem_minmax(0,1fr)_2rem] gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-850"
							>
								<button
									type="button"
									class="contents text-left"
									on:click={() => {
										onClick(preview.sourceId ?? id);
										openPreview = false;
									}}
								>
									<img
										src={faviconUrl(preview)}
										alt=""
										class="mt-0.5 size-7 rounded-full bg-gray-50 ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700"
										on:error={(event) => {
											event.currentTarget.src = '/favicon.png';
										}}
									/>
									<span class="min-w-0">
										<span
											class="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100"
										>
											{decodeString(preview?.source?.name ?? title)}
										</span>
										{#if sourceDomain(preview)}
											<span class="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">
												{sourceDomain(preview)}
											</span>
										{/if}
										{@const snippet = getPreviewSnippet(preview?.document?.[0])}
										{#if snippet}
											<span
												class="mt-2 line-clamp-3 block text-xs leading-5 text-gray-500 dark:text-gray-400"
											>
												{snippet}
											</span>
										{/if}
									</span>
								</button>
								{#if sourceUrl(preview)}
									<button
										type="button"
										aria-label={$i18n.t('Open source: {{title}}', {
											title: decodeString(preview?.source?.name ?? title)
										})}
										class="flex size-7 items-center justify-center rounded-lg bg-gray-50 text-base text-gray-500 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-white"
										on:click={(event) => openSourceLink(event, preview)}
									>
										↗
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</LinkPreview.Content>
			</LinkPreview.Portal>
		</LinkPreview.Root>
	{:else}
		<button
			aria-label={$i18n.t('View source: {{title}}', { title: decodedTitle() })}
			class="text-[10px] w-fit translate-y-[2px] px-2 py-0.5 dark:bg-white/5 dark:text-white/80 dark:hover:text-white bg-gray-50 text-black/80 hover:text-black transition rounded-xl"
			on:click={() => {
				onClick(id);
			}}
		>
			<span class="line-clamp-1">
				{getDisplayTitle(decodedTitle())}
				{#if extraCount > 0}
					<span class="dark:text-white/50 text-black/50">+{extraCount}</span>
				{/if}
			</span>
		</button>
	{/if}
{/if}
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test:frontend -- src/lib/enos/deskUiSource.test.ts src/lib/enos/sourceCitations.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run Svelte type check**

Run:

```bash
npm run check
```

Expected: PASS with no Svelte or TypeScript errors.

- [ ] **Step 7: Commit preview UI**

Run:

```bash
git add src/lib/components/chat/Messages/Markdown/Source.svelte src/lib/components/chat/Messages/Markdown/SourceToken.svelte src/lib/enos/deskUiSource.test.ts
git commit -m "feat: preview inline sources"
```

## Task 5: Verify Build And Reversibility

**Files:**

- Modify only if tests expose a compile issue: files changed in Tasks 1-4.

- [ ] **Step 1: Run full focused frontend tests**

Run:

```bash
npm run test:frontend -- src/lib/enos/sourceCitations.test.ts src/lib/enos/sourceLabels.test.ts src/lib/enos/deskUiSource.test.ts
```

Expected: PASS for all listed test files.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build completes successfully. The `build/` directory updates as a generated build artifact.

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
git diff --stat HEAD~3..HEAD
git diff -- src/lib/components/chat/Messages/Citations.svelte src/lib/components/chat/Messages/Markdown/Source.svelte src/lib/components/chat/Messages/Markdown/SourceToken.svelte
```

Expected:

- `Citations.svelte` only swaps local reduction for `buildEnosCitations`.
- `Source.svelte` owns the preview UI.
- `SourceToken.svelte` only maps citation tokens to preview records.
- No backend, database, or saved-chat schema files changed.

- [ ] **Step 4: Commit any compile-only fixes**

If Step 2 required a compile fix, commit only the fix files:

```bash
git add <fixed-file-paths>
git commit -m "fix: compile inline source previews"
```

If Step 2 passed without fixes, do not create an empty commit.

- [ ] **Step 5: Record verification result**

Add a short implementation note to the task handoff or PR body:

```md
Verification:

- npm run test:frontend -- src/lib/enos/sourceCitations.test.ts src/lib/enos/sourceLabels.test.ts src/lib/enos/deskUiSource.test.ts
- npm run check
- npm run build

Reversibility:

- New preview is isolated to inline Markdown citation components.
- Existing CitationModal and showSourceModal path are still present.
- No backend or persisted chat schema changes.
```
