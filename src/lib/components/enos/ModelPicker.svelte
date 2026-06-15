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

<div class="enos-picker" class:open>
  <button
    type="button"
    class="enos-picker__trigger"
    aria-haspopup="listbox"
    aria-expanded={open}
    on:click={() => (open = !open)}
  >
    {currentLabel}
  </button>

  {#if open}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="enos-picker__backdrop"
      role="none"
      on:click={() => (open = false)}
    ></div>
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
          {mind.label}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .enos-picker {
    position: relative;
  }

  .enos-picker__trigger {
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    border: none;
    background: transparent;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    color: inherit;
    white-space: nowrap;
  }

  .enos-picker__trigger:hover {
    background: rgba(128, 128, 128, 0.12);
  }

  .enos-picker__backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
  }

  .enos-picker__menu {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    z-index: 50;
    min-width: 10rem;
    background: var(--color-gray-850, #1a1a1a);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0.75rem;
    padding: 0.375rem;
    list-style: none;
    margin: 0;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  .enos-picker__option {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-gray-100, #f3f4f6);
  }

  .enos-picker__option:hover {
    background: rgba(255,255,255,0.06);
  }

  .enos-picker__option.selected {
    font-weight: 600;
    color: #fff;
  }
</style>
