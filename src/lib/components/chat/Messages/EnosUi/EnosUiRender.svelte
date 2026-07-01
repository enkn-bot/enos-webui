<script>
  import MapRender from './MapRender.svelte';
  import GalleryRender from './GalleryRender.svelte';
  import EnosUiNode from './EnosUiNode.svelte';

  /** @type {any} */
  export let spec = null;
</script>

{#if spec?.component === 'map'}
  <MapRender data={spec.data ?? {}} />
{:else if spec?.component === 'gallery'}
  <GalleryRender data={spec.data ?? {}} />
{:else if spec?.component}
  <EnosUiNode node={spec} />
{/if}
<!-- unknown/empty spec: render nothing (never dump raw JSON) -->
