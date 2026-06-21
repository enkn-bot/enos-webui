import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('non-base caveat notice path is removed so backend caveats render as markdown', () => {
	const contentRenderer = readFileSync(
		'src/lib/components/chat/Messages/ContentRenderer.svelte',
		'utf8'
	);

	assert.equal(
		existsSync('src/lib/components/chat/Messages/CaveatNotice.svelte'),
		false,
		'CaveatNotice should be deleted when no live renderer imports remain'
	);
	assert.doesNotMatch(
		contentRenderer,
		/CaveatNotice|CAVEAT_MARKER|extractCaveat|caveatText|bodyContent/,
		'ContentRenderer should not strip caveat markdown into a custom frontend notice'
	);
	assert.match(
		contentRenderer,
		/content=\{model\?\.info\?\.meta\?\.capabilities\?\.citations === false/,
		'ContentRenderer should pass the original content through the normal Markdown path'
	);
});

test('surface script no longer injects a random welcome greeting over the base placeholder', () => {
	const surface = readFileSync('static/static/enos-surface.mjs', 'utf8');
	const staticCss = readFileSync('static/static/custom.css', 'utf8');
	const backendCss = readFileSync('backend/open_webui/static/custom.css', 'utf8');

	assert.doesNotMatch(
		surface,
		/composeWelcomeGreeting|ensureWelcomeGreeting|findWelcomeNameRow|loadUserFirstName|enos-welcome-greeting|data-enos-welcome-hidden/,
		'Surface script should not build, hide, or inject welcome greeting DOM'
	);
	assert.doesNotMatch(
		staticCss + backendCss,
		/enos-welcome-greeting|data-enos-welcome-hidden/,
		'Greeting-only CSS should be removed with the DOM injection path'
	);
});

test('ENOS orb loader component has live loading-state ownership', () => {
	const skeleton = readFileSync('src/lib/components/chat/Messages/Skeleton.svelte', 'utf8');
	const statusItem = readFileSync(
		'src/lib/components/chat/Messages/ResponseMessage/StatusHistory/StatusItem.svelte',
		'utf8'
	);

	assert.equal(
		existsSync('src/lib/components/common/EnosOrb.svelte'),
		true,
		'EnosOrb should exist now that loader states import it'
	);
	assert.match(
		skeleton + statusItem,
		/EnosOrb/,
		'EnosOrb should have live imports in model response/tool loading states'
	);
});
