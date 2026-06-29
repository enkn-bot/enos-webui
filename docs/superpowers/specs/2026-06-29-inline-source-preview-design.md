# Inline Source Preview Design

## Goal

Improve inline citation pills inside assistant responses, such as `Who Are You - Wikipedia +1`, so hover/focus shows a clean Perplexity-style source preview anchored directly under the pill.

This does not redesign the bottom response-level `Sources` control. That component can keep its current behavior.

## Approved Direction

Use a rich inline preview:

- The inline pill opens a preview directly below the pill by default.
- The preview flips above or shifts horizontally when the pill is near a viewport edge.
- Grouped pills show multiple sources in one card with favicon/logo stack and `N sources`.
- Single-source pills show the same card language without extra grouping controls.
- The preview shows title, domain/source label, a short retrieved-content snippet when available, and an explicit external-link icon.
- The preview does not show instructional chips such as "hover/focus = preview".

## Interaction Contract

- Hover and keyboard focus open the preview.
- Click or tap pins/opens the preview for touch and deliberate inspection.
- Escape or outside click closes a pinned preview.
- The `↗` affordance opens the external URL in a new tab when a URL exists.
- Existing citation modal/deep inspection behavior remains available as the fallback for retrieved content and non-URL citations.

## Data Flow

Current flow:

- `ResponseMessage.svelte` passes `message.sources ?? message.citations` into `ContentRenderer.svelte`.
- `ContentRenderer.svelte` derives `sourceIds` with `getEnosSourceIds(...)`.
- `Markdown.svelte`, `MarkdownTokens.svelte`, `MarkdownInlineTokens.svelte`, and `SourceToken.svelte` propagate `sourceIds`.
- `Source.svelte` renders each inline pill and calls `onSourceClick(id)`, which reaches `Citations.svelte.showSourceModal(id)`.

New flow:

- Extract the citation reduction logic currently embedded in `Citations.svelte` into a small pure helper, for example `src/lib/enos/sourceCitations.ts`.
- The helper returns normalized citation records with `id`, `source.name`, `source.url`, `document[]`, `metadata[]`, and `distances[]`.
- `Citations.svelte` uses the helper instead of maintaining its own reduction logic.
- `ContentRenderer.svelte` uses the same helper to build `sourcePreviews`.
- Markdown components pass `sourcePreviews` alongside the existing `sourceIds`.
- `SourceToken.svelte` resolves the preview records for each inline citation id and passes them into `Source.svelte`.
- `Source.svelte` renders the existing pill plus the new anchored preview.

## Reversibility

Keep the change easy to back out:

- No backend changes.
- No database or saved-chat schema changes.
- No removal of `CitationModal`.
- No removal of `showSourceModal`.
- Keep `sourceIds` as the existing compatibility path.
- Isolate the new UI to inline citation components and one pure normalization helper.
- If needed, guard the new popover behind a local component prop or setting while retaining the old click-only behavior.

## Visual Details

- Anchor the popover to the inline pill, not to the response container.
- Use the existing favicon pattern already used by citations where a URL exists.
- Use a neutral fallback icon or compact initial only for non-web/file sources.
- Keep the card quiet: white surface, subtle border, light shadow, 16px or smaller radius, restrained typography.
- Do not show usage instructions inside the card.
- Preserve text wrapping around inline pills; the popover must be layered and must not affect paragraph layout.

## Accessibility

- Inline pills remain buttons with meaningful `aria-label`.
- The preview opens on focus, not only hover.
- Pinned preview closes on Escape and outside click.
- External-link controls have explicit labels such as `Open source: <title>`.
- Keyboard users can reach source rows and external-link buttons.

## Testing

Add focused coverage for:

- Normalized citation records match existing `sourceIds` behavior.
- Raw ENOS tool labels still resolve to readable source titles.
- URL sources provide favicon/link metadata.
- Grouped inline citation tokens receive all preview records.
- Existing `onSourceClick` modal path remains wired.

Run `npm run build` after implementation because Svelte compile errors are the real integration gate.
