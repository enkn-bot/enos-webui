import { writable } from 'svelte/store';

// The currently selected ENOS model ID (mirrors the first entry of OWUI's selectedModels).
// Default: 'enos.mind' — the balanced tier.
export const selectedModels = writable<string[]>(['enos.mind']);
