import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { pendingAnnotation } from './annotations';

describe('pendingAnnotation', () => {
    it('starts empty', () => {
        expect(get(pendingAnnotation)).toBe('');
    });

    it('can be set and cleared', () => {
        pendingAnnotation.set('> hello\n\n');
        expect(get(pendingAnnotation)).toBe('> hello\n\n');
        pendingAnnotation.set('');
        expect(get(pendingAnnotation)).toBe('');
    });
});
