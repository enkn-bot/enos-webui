import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bv = readFileSync('src/lib/components/enos/BrowserView.svelte', 'utf8');

test('BrowserView imports addAnnotation', () => {
	assert.match(bv, /addAnnotation/);
});
test('BrowserView toggles annotate mode via webview.send', () => {
	assert.match(bv, /send(\?\.)?\(\s*['"]enos:annotate-mode['"]/);
});
test('BrowserView listens for ipc-message', () => {
	assert.match(bv, /ipc-message/);
});
test('BrowserView binds the annotate shortcut', () => {
	assert.match(bv, /key === '\.'|metaKey/);
});

const mi = readFileSync('src/lib/components/chat/MessageInput.svelte', 'utf8');

test('MessageInput reads the pendingAnnotations store', () => {
	assert.match(mi, /\$pendingAnnotations/);
});
test('MessageInput clears annotations on send', () => {
	assert.match(mi, /clearAnnotations\(\)/);
});
test('MessageInput serializes annotations into the message on send', () => {
	assert.match(mi, /serializeAnnotations\(\$pendingAnnotations, prompt\)/);
	assert.match(mi, /submitWithAnnotations/);
});
test('MessageInput renders the annotation chip with count', () => {
	assert.match(mi, /\$pendingAnnotations\.length\} annotation/);
});
test('MessageInput does not attach annotation screenshots as files', () => {
	assert.doesNotMatch(mi, /dataUrlToFile/);
});
