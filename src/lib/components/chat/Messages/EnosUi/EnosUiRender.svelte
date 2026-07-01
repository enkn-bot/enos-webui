<script>
  import MapRender from './MapRender.svelte';
  import GalleryRender from './GalleryRender.svelte';

  /** @type {any} */
  export let spec = null;

  // Standalone generated image (image-gen) — bounded so a 1024² render doesn't
  // fill the whole message. Base markdown renders ordinary images; this is only
  // for the server-authored image supplement.
  const SIZE = { sm: 'max-w-[256px]', md: 'max-w-[384px]', lg: 'max-w-[512px]' };
  const RATIO = { square: 'aspect-square', video: 'aspect-video', auto: '' };
  let broken = false;
</script>

<!-- ENOS supplements ONLY. Ordinary structured content is NATURAL MARKDOWN rendered
     by base OWUI (organic, richer). We render exactly the three things base can't do:
     interactive map, photo gallery, generated image. Anything else -> nothing. -->
{#if spec?.component === 'map'}
  <MapRender data={spec.data ?? {}} />
{:else if spec?.component === 'gallery'}
  <GalleryRender data={spec.data ?? {}} />
{:else if spec?.component === 'image' && spec?.src && !broken}
  <div class={SIZE[spec.size] ?? SIZE.md}>
    <img
      src={spec.src}
      alt={spec.alt ?? ''}
      loading="lazy"
      referrerpolicy="no-referrer"
      on:error={() => (broken = true)}
      class="w-full {RATIO[spec.ratio] ?? ''} object-cover rounded-xl bg-gray-50 dark:bg-gray-900/50"
    />
  </div>
{/if}
