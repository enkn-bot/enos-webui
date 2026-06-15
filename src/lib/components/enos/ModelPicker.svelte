<script lang="ts">
  const MINDS = [
    { id: 'enos.subconscious', label: 'Subconscious' },
    { id: 'enos.mind',         label: 'Mind' },
    { id: 'enos.deepmind',     label: 'DeepMind' },
  ] as const;

  export let value: string = 'enos.mind';
  export let onSelect: (id: string) => void = () => {};

  let open = false;

  $: currentLabel = MINDS.find(m => m.id === value)?.label ?? value ?? 'Mind';

  function select(id: string) {
    onSelect(id);
    open = false;
  }
</script>

<div class="relative flex items-center">
  <button
    type="button"
    class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition select-none"
    aria-haspopup="listbox"
    aria-expanded={open}
    on:click={() => (open = !open)}
  >
    <span>{currentLabel}</span>
    <svg class="opacity-40 transition-transform duration-150 {open ? 'rotate-180' : ''}" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </button>

  {#if open}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="fixed inset-0 z-40" role="none" on:click={() => (open = false)}></div>

    <ul
      role="listbox"
      class="absolute top-full mt-2 left-0 z-50 w-48 rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 dark:text-white shadow-lg"
    >
      {#each MINDS as mind}
        <li
          role="option"
          aria-selected={value === mind.id}
          class="flex w-full items-center px-3 py-2 text-sm text-left select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl {value === mind.id ? 'font-semibold' : ''}"
          on:click={() => select(mind.id)}
          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(mind.id)}
          tabindex="0"
        >
          <span class="flex-1 line-clamp-1">{mind.label}</span>
          {#if value === mind.id}
            <svg class="shrink-0 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
