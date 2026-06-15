<script lang="ts">
  const MINDS = [
    {
      id: 'enos.subconscious',
      label: 'Subconscious',
      description: 'Fast, ambient',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`
    },
    {
      id: 'enos.mind',
      label: 'Mind',
      description: 'Balanced, default',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>`
    },
    {
      id: 'enos.deepmind',
      label: 'DeepMind',
      description: 'Deep reasoning',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`
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

<div class="enos-picker" class:open>
  <button
    type="button"
    class="enos-picker__trigger"
    aria-haspopup="listbox"
    aria-expanded={open}
    on:click={() => (open = !open)}
  >
    <span class="enos-picker__trigger-icon">{@html currentMind.icon}</span>
    <span class="enos-picker__trigger-label">{currentMind.label}</span>
    <svg class="enos-picker__chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m18 15-6-6-6 6"/>
    </svg>
  </button>

  {#if open}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="enos-picker__backdrop" role="none" on:click={() => (open = false)}></div>
    <ul class="enos-picker__menu" role="listbox">
      {#each MINDS as mind}
        <li
          role="option"
          aria-selected={value === mind.id}
          class="enos-picker__option"
          class:selected={value === mind.id}
          on:click={() => select(mind.id)}
          on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(mind.id)}
          tabindex="0"
        >
          <span class="enos-picker__option-icon">{@html mind.icon}</span>
          <span class="enos-picker__option-text">
            <span class="enos-picker__option-label">{mind.label}</span>
            <span class="enos-picker__option-desc">{mind.description}</span>
          </span>
          {#if value === mind.id}
            <svg class="enos-picker__check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .enos-picker {
    position: relative;
    display: flex;
    align-items: center;
  }

  .enos-picker__trigger {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.55rem;
    border-radius: 9999px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: rgb(107 114 128);
    transition: background 0.1s, color 0.1s;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    line-height: 1;
  }
  .enos-picker__trigger:hover {
    background: rgba(0, 0, 0, 0.06);
    color: rgb(31 41 55);
  }
  :global(.dark) .enos-picker__trigger {
    color: rgb(156 163 175);
  }
  :global(.dark) .enos-picker__trigger:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgb(243 244 246);
  }

  .enos-picker__trigger-icon {
    display: flex;
    align-items: center;
    opacity: 0.7;
  }
  .enos-picker__trigger-label {
    font-size: 0.8125rem;
  }
  .enos-picker__chevron {
    opacity: 0.5;
    transition: transform 0.15s;
  }
  .open .enos-picker__chevron {
    transform: rotate(180deg);
  }

  .enos-picker__backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
  }

  /* Dropdown card — matches OWUI InputMenu style */
  .enos-picker__menu {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 0;
    z-index: 50;
    min-width: 14rem;
    background: #fff;
    border-radius: 0.875rem;
    padding: 0.375rem;
    list-style: none;
    margin: 0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
  }
  :global(.dark) .enos-picker__menu {
    background: rgb(24 24 27);
    border-color: rgba(255, 255, 255, 0.07);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  .enos-picker__option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.625rem;
    cursor: pointer;
    color: rgb(31 41 55);
    transition: background 0.1s;
  }
  .enos-picker__option:hover {
    background: rgb(243 244 246);
  }
  :global(.dark) .enos-picker__option {
    color: rgb(229 231 235);
  }
  :global(.dark) .enos-picker__option:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .enos-picker__option.selected {
    color: rgb(17 24 39);
  }
  :global(.dark) .enos-picker__option.selected {
    color: #fff;
  }

  .enos-picker__option-icon {
    display: flex;
    align-items: center;
    color: rgb(107 114 128);
    flex-shrink: 0;
    width: 1.25rem;
    justify-content: center;
  }
  :global(.dark) .enos-picker__option-icon {
    color: rgb(156 163 175);
  }
  .selected .enos-picker__option-icon {
    color: rgb(31 41 55);
  }
  :global(.dark) .selected .enos-picker__option-icon {
    color: rgb(229 231 235);
  }

  .enos-picker__option-text {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .enos-picker__option-label {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25;
  }
  .enos-picker__option-desc {
    font-size: 0.75rem;
    color: rgb(107 114 128);
    line-height: 1.25;
  }

  .enos-picker__check {
    color: rgb(31 41 55);
    flex-shrink: 0;
  }
  :global(.dark) .enos-picker__check {
    color: rgb(229 231 235);
  }
</style>
