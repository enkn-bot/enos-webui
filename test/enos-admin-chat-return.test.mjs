import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('model picker subtitles stay left aligned under the model name', () => {
	const picker = readFileSync('src/lib/components/enos/ModelPicker.svelte', 'utf8');

	assert.match(
		picker,
		/<div class="[^"]*flex-col[^"]*items-start[^"]*"/,
		'ModelPicker option text should use a left-aligned column so subtitle positioning follows the label'
	);

	assert.match(
		picker,
		/<span class="[^"]*text-left[^"]*text-\[11px\][^"]*truncate[^"]*">\{mind\.subtitle\}<\/span>/,
		'ModelPicker subtitles must be explicitly left-aligned instead of inheriting centered button text'
	);
});

test('admin user chat links carry a return target into shared-chat view', () => {
	const userChatsModal = readFileSync(
		'src/lib/components/admin/Users/UserList/UserChatsModal.svelte',
		'utf8'
	);
	const chatsModal = readFileSync('src/lib/components/layout/ChatsModal.svelte', 'utf8');

	assert.match(
		userChatsModal,
		/shareReturnUrl="\/admin\/users\/overview"/,
		'Admin user chat modal should tell shared chat views where to return'
	);

	assert.match(
		chatsModal,
		/export let shareReturnUrl = '';/,
		'ChatsModal should expose a return-url prop for shared chat links'
	);

	assert.match(
		chatsModal,
		/returnTo=\$\{encodeURIComponent\(shareReturnUrl\)\}/,
		'Shared chat links should encode the admin return target into the URL'
	);
});

test('shared chat page renders a back option when opened from admin user chats', () => {
	const sharedPage = readFileSync('src/routes/s/[id]/+page.svelte', 'utf8');

	assert.match(
		sharedPage,
		/const returnTo =/,
		'Shared chat page should read the optional return target from the URL'
	);
	assert.match(
		sharedPage,
		/returnTo\.startsWith\('\/admin\/users'\)/,
		'Shared chat page should only honor the admin users return target'
	);
	assert.match(
		sharedPage,
		/goto\(returnTo\)/,
		'The back option should navigate to the admin users return target'
	);
	assert.match(
		sharedPage,
		/\$i18n\.t\('Back to Users'\)/,
		'The back option should be visible as a clear user-facing control'
	);
});
