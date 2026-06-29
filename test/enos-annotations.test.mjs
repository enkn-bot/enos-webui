// test/enos-annotations.test.mjs  (NEW FILE)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const localFileNav = readFileSync('src/lib/components/chat/LocalFileNav.svelte', 'utf8');

test('LocalFileNav: imports pendingAnnotation store', () => {
    assert.match(localFileNav, /pendingAnnotation/, 'Must import pendingAnnotation store');
});

test('LocalFileNav: has handleQuoteInChat function', () => {
    assert.match(localFileNav, /handleQuoteInChat/, 'Must have a handleQuoteInChat handler');
});

test('LocalFileNav: Quote button only shown for utf8 files', () => {
    assert.match(localFileNav, /encoding.*utf8|utf8.*encoding/,
        'Quote button must guard on utf8 encoding');
});
