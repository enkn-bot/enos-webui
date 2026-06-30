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

test('MessageInput subscribes to pendingAnnotations', () => {
	assert.match(mi, /pendingAnnotations\.subscribe/);
});
test('MessageInput attaches the screenshot via inputFilesHandler', () => {
	assert.match(mi, /inputFilesHandler\(\[dataUrlToFile/);
});
test('MessageInput consumes annotations with clearAnnotations', () => {
	assert.match(mi, /clearAnnotations\(\)/);
});
test('MessageInput folds the note/source ref into the prompt', () => {
	assert.match(mi, /annotationRef\(a\)/);
});
