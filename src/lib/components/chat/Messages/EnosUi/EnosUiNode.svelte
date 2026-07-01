<script>
  import { getContext } from 'svelte';
  import GalleryRender from './GalleryRender.svelte';

  /** @type {any} */
  export let node = null;
  /** @type {number} */
  export let depth = 0;

  const MAX_DEPTH = 6;

  // semantic token maps (renderer OWNS all style; model never sets these)
  const GAP = { sm: 'gap-1.5', md: 'gap-3', lg: 'gap-5' };
  const HEADING = {
    1: 'text-lg font-semibold text-black dark:text-white',
    2: 'text-base font-semibold text-black dark:text-white',
    3: 'text-sm font-semibold text-gray-700 dark:text-gray-200'
  };
  const BADGE = {
    neutral: 'bg-gray-100 dark:bg-gray-850 text-gray-600 dark:text-gray-300',
    success: 'bg-green-500/15 text-green-600 dark:text-green-400',
    warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  };
  const RATIO = { square: 'aspect-square', video: 'aspect-video', auto: '' };
  // Optional width cap for standalone images (e.g. generated images) so a 1024²
  // render doesn't fill the whole message. Omitted -> full width (grid cells etc).
  const SIZE = { sm: 'max-w-[256px]', md: 'max-w-[384px]', lg: 'max-w-[512px]' };

  $: comp = node && typeof node === 'object' ? node.component : null;
  $: kids = Array.isArray(node?.children) ? node.children.filter((c) => c && typeof c === 'object') : [];
  $: tooDeep = depth >= MAX_DEPTH;
  let broken = {};
</script>

{#if !node || typeof node !== 'object' || tooDeep}
  <!-- drop: unknown/malformed/too-deep renders nothing -->
{:else if comp === 'card'}
  <div class="rounded-2xl border border-gray-100/30 dark:border-gray-850/30 overflow-hidden">
    {#if node.title}
      <div class="px-4 py-3 border-b border-gray-100/30 dark:border-gray-850/30">
        <h2 class="text-sm font-semibold text-black dark:text-white">{node.title}</h2>
      </div>
    {/if}
    <div class="p-4 flex flex-col gap-3">
      {#each kids as child}<svelte:self node={child} depth={depth + 1} />{/each}
    </div>
  </div>
{:else if comp === 'stack'}
  <div class="flex flex-col {GAP[node.gap] ?? GAP.md}">
    {#each kids as child}<svelte:self node={child} depth={depth + 1} />{/each}
  </div>
{:else if comp === 'row'}
  <div class="flex flex-row flex-wrap items-center gap-3">
    {#each kids as child}<svelte:self node={child} depth={depth + 1} />{/each}
  </div>
{:else if comp === 'grid'}
  <div class="grid grid-cols-2 {node.cols === 3 ? 'sm:grid-cols-3' : ''} gap-3">
    {#each kids as child}<svelte:self node={child} depth={depth + 1} />{/each}
  </div>
{:else if comp === 'heading' && node.text}
  <h3 class={HEADING[node.level] ?? HEADING[2]}>{node.text}</h3>
{:else if comp === 'text' && node.text}
  <p class="text-sm leading-relaxed {node.tone === 'muted' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}">{node.text}</p>
{:else if comp === 'keyvalue' && Array.isArray(node.pairs)}
  <dl class="flex flex-col divide-y divide-gray-100/30 dark:divide-gray-850/30">
    {#each node.pairs.filter((p) => p && (p.k || p.v)) as p}
      <div class="flex justify-between gap-4 py-1.5">
        <dt class="text-sm text-gray-400 dark:text-gray-500">{p.k ?? ''}</dt>
        <dd class="text-sm text-gray-800 dark:text-gray-100 text-right">{p.v ?? ''}</dd>
      </div>
    {/each}
  </dl>
{:else if comp === 'list' && Array.isArray(node.items)}
  <svelte:element this={node.ordered ? 'ol' : 'ul'} class="flex flex-col gap-1.5 {node.ordered ? 'list-decimal' : 'list-disc'} pl-5">
    {#each node.items.filter((i) => i != null) as item}
      <li class="text-sm text-gray-700 dark:text-gray-200">{typeof item === 'string' ? item : ''}</li>
    {/each}
  </svelte:element>
{:else if comp === 'table' && Array.isArray(node.columns) && Array.isArray(node.rows)}
  <div class="overflow-x-auto rounded-xl border border-gray-100/30 dark:border-gray-850/30">
    <table class="w-full text-sm">
      <thead><tr class="border-b border-gray-100/30 dark:border-gray-850/30">
        {#each node.columns as col}<th class="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{col}</th>{/each}
      </tr></thead>
      <tbody>
        {#each node.rows.filter(Array.isArray) as r}
          <tr class="border-b border-gray-100/20 dark:border-gray-850/20 last:border-0">
            {#each r as cell}<td class="px-3 py-2 text-gray-700 dark:text-gray-200">{typeof cell === 'string' || typeof cell === 'number' ? cell : ''}</td>{/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else if comp === 'badge' && node.text}
  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium {BADGE[node.variant] ?? BADGE.neutral}">{node.text}</span>
{:else if comp === 'image' && node.src}
  {#if !broken[node.src]}
    <div class={SIZE[node.size] ?? ''}>
      <img src={node.src} alt={node.alt ?? ''} loading="lazy" referrerpolicy="no-referrer"
        on:error={() => (broken = { ...broken, [node.src]: true })}
        class="w-full {RATIO[node.ratio] ?? ''} object-cover rounded-xl bg-gray-50 dark:bg-gray-900/50" />
    </div>
  {/if}
{:else if comp === 'divider'}
  <hr class="border-gray-100/30 dark:border-gray-850/30" />
{:else if comp === 'gallery'}
  <GalleryRender data={node.data ?? node} />
{:else}
  <!-- unknown atom: render nothing -->
{/if}
