import { writable } from 'svelte/store';
import type { Annotation } from '$lib/enos/annotation';

export const pendingAnnotations = writable<Annotation[]>([]);

export const addAnnotation = (a: Annotation): void =>
	pendingAnnotations.update((list) => [...list, a]);

export const removeAnnotation = (id: string): void =>
	pendingAnnotations.update((list) => list.filter((x) => x.id !== id));

export const clearAnnotations = (): void => pendingAnnotations.set([]);
