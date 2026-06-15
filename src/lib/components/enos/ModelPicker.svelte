<script lang="ts">
  const MINDS = [
    {
      id: 'enos.subconscious',
      label: 'Subconscious',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`
    },
    {
      id: 'enos.mind',
      label: 'Mind',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>`
    },
    {
      id: 'enos.deepmind',
      label: 'DeepMind',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
    },
  ] as const;

  export let value: string = 'enos.mind';
  export let onSelect: (id: string) => void = () => {};

  let open = false;

  $: currentMind = MINDS.find(m => m.id === value) ?? MINDS[1];

  function select(id: string) {
    onSelect(id);
    open = false;
  }
</script>

<div class="relative flex items-center">
  <!-- Trigger — same style as other toolbar text buttons -->
  <button
    type="button"
    class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200 transition select-none"
    aria-haspopup="listbox"
    aria-expanded={open}
    on:click={() => (open = !open)}
  >
    <span class="flex items-center opacity-70">{@html currentMind.icon}</span>
    <span>{currentMind.label}</span>
    <svg class="opacity-40 transition-transform duration-150 {open ? 'rotate-180' : ''}" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  </button>

  {#if open}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="fixed inset-0 z-40" role="none" on:click={() => (open = false)}></div>

    <!-- Dropdown — exact same card as InputMenu -->
    <ul
      role="listbox"
      class="absolute bottom-full mb-2 left-0 z-50 w-56 rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 dark:text-white shadow-lg"
    >
      {#each MINDS as mind}
        <li
          role="option"
          aria-selected={value === mind.id}
          class="flex w-full gap-2 items-center px-3 py-2 text-sm select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl"
          on:click={() => select(mind.id)}
          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(mind.id)}
          tabindex="0"
        >
          <span class="flex items-center shrink-0 text-gray-600 dark:text-gray-300">
            {@html mind.icon}
          </span>
          <span class="line-clamp-1 flex-1 {value === mind.id ? 'font-semibold' : ''}">
            {mind.label}
          </span>
          {#if value === mind.id}
            <svg class="shrink-0 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
