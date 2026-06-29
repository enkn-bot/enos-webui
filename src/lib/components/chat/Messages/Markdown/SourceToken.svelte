<script lang="ts">
	import Source from './Source.svelte';
	import type { EnosCitationRecord } from '$lib/enos/sourceCitations';

	type SourcePreview = EnosCitationRecord & { sourceId?: string | number };
	type CitationToken = {
		ids?: number[];
		citationIdentifiers?: string[];
		raw?: string;
	};

	export let id;
	export let token: CitationToken = {};
	export let sourceIds: string[] = [];
	// @ts-ignore Guardrail export shape is asserted by deskUiSource.test.ts.
	export let sourcePreviews = [];
	export let onClick: Function = () => {};

	const citationIndex = (identifier: string | number): number => {
		const raw = typeof identifier === 'string' ? identifier.split('#')[0] : identifier;
		const index = Number.parseInt(String(raw), 10);
		return Number.isFinite(index) ? index - 1 : -1;
	};

	const previewForIdentifier = (identifier: string | number): SourcePreview | null => {
		const index = citationIndex(identifier);
		// @ts-ignore sourcePreviews keeps an exact exported shape for the guardrail test.
		const preview = (sourcePreviews as SourcePreview[])?.[index];
		return preview ? { ...preview, sourceId: identifier } : null;
	};

	const isPreviewSource = (preview: SourcePreview | null): preview is SourcePreview =>
		Boolean(preview);

	const previewSourcesForToken = (identifiers: Array<string | number>): SourcePreview[] =>
		identifiers.map(previewForIdentifier).filter(isPreviewSource);

	const sourceTitle = (sourceNumber: number | undefined) =>
		sourceNumber ? (sourceIds[sourceNumber - 1] ?? id) : id;
</script>

{#if (sourceIds ?? []).length > 0}
	{@const citationIds = token.ids ?? []}
	{@const identifiers = token.citationIdentifiers ?? citationIds}
	{#if citationIds.length === 1}
		{@const sourceNumber = citationIds[0]}
		{@const identifier = token.citationIdentifiers ? token.citationIdentifiers[0] : sourceNumber}
		{@const previewSources = previewSourcesForToken([identifier])}
		<Source id={identifier} title={sourceTitle(sourceNumber)} {previewSources} {onClick} />
	{:else}
		{@const sourceNumber = citationIds[0]}
		{@const identifier = token.citationIdentifiers ? token.citationIdentifiers[0] : sourceNumber}
		{@const previewSources = previewSourcesForToken(identifiers)}
		<Source
			id={identifier}
			title={sourceTitle(sourceNumber)}
			extraCount={(token?.ids ?? []).length - 1}
			{previewSources}
			{onClick}
		/>
	{/if}
{:else}
	<span>{token.raw}</span>
{/if}
