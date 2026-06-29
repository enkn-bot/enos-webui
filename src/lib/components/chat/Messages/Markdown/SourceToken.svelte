<script lang="ts">
	import Source from './Source.svelte';
	import type { EnosCitationRecord } from '$lib/enos/sourceCitations';

	type SourcePreview = EnosCitationRecord & { sourceId?: string | number };
	type CitationToken = {
		ids?: number[];
		citationIdentifiers?: string[];
		raw?: string;
	};
	type CitationReference = {
		sourceNumber: number;
		clickId: string | number;
	};

	export let id;
	export let token: CitationToken = {};
	export let sourceIds: string[] = [];
	export let sourcePreviews: SourcePreview[] = [];
	export let onClick: Function = () => {};

	const typedSourcePreviews = () => sourcePreviews;

	const citationReferences = (): CitationReference[] => {
		return (token.ids ?? []).map((sourceNumber, index) => ({
			sourceNumber,
			clickId: token.citationIdentifiers?.[index] ?? sourceNumber - 1
		}));
	};

	const previewForReference = (reference: CitationReference): SourcePreview | null => {
		const preview = typedSourcePreviews()?.[reference.sourceNumber - 1];
		return preview ? { ...preview, sourceId: reference.clickId } : null;
	};

	const isPreviewSource = (preview: SourcePreview | null): preview is SourcePreview =>
		Boolean(preview);

	const previewSourcesForToken = (references: CitationReference[]): SourcePreview[] =>
		references.map(previewForReference).filter(isPreviewSource);

	const sourceTitle = (sourceNumber: number | undefined) =>
		sourceNumber ? (sourceIds[sourceNumber - 1] ?? id) : id;
</script>

{#if (sourceIds ?? []).length > 0}
	{@const references = citationReferences()}
	{#if references.length === 1}
		{@const reference = references[0]}
		{@const previewSources = previewSourcesForToken([reference])}
		<Source
			id={reference.clickId}
			title={sourceTitle(reference.sourceNumber)}
			{previewSources}
			{onClick}
		/>
	{:else if references.length > 1}
		{@const reference = references[0]}
		{@const previewSources = previewSourcesForToken(references)}
		<Source
			id={reference.clickId}
			title={sourceTitle(reference.sourceNumber)}
			extraCount={(token?.ids ?? []).length - 1}
			{previewSources}
			{onClick}
		/>
	{:else}
		<span>{token.raw}</span>
	{/if}
{:else}
	<span>{token.raw}</span>
{/if}
