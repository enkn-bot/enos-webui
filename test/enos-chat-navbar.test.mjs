import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('chat navbar exposes the chat title action menu only on ENOS Desk', () => {
	const navbar = readFileSync('src/lib/components/chat/Navbar.svelte', 'utf8');
	const chat = readFileSync('src/lib/components/chat/Chat.svelte', 'utf8');
	const menu = readFileSync('src/lib/components/layout/Navbar/Menu.svelte', 'utf8');
	const navbarInvocation = chat.match(/<Navbar[\s\S]*?\n\s*\/>/)?.[0] ?? '';

	assert.match(
		navbar,
		/import ModelSelector/,
		'Navbar should keep the old model picker path for non-Desk surfaces'
	);
	assert.match(
		navbar,
		/getEnosDesktopBridge/,
		'Navbar should gate the chat title menu on the ENOS Desk bridge'
	);
	assert.match(
		navbar,
		/let isEnosDeskNavbar = false/,
		'Navbar should default to the normal web behavior until Desk is detected'
	);
	assert.match(
		navbar,
		/export let selectedModels/,
		'Navbar should keep model selection props for the existing web slot'
	);
	assert.match(
		navbar,
		/export let showModelSelector = true/,
		'Navbar should keep the existing model selector toggle for web'
	);
	assert.match(
		navbar,
		/export let title/,
		'Navbar should accept the active chat title for the title menu trigger'
	);
	assert.match(
		navbar,
		/const chatTitleLabel =/,
		'Navbar should derive a stable label for the chat title menu trigger'
	);
	assert.match(
		navbar,
		/id="chat-title-menu-button"/,
		'Navbar should expose a dedicated chat title menu trigger'
	);
	assert.match(
		navbar,
		/{#if isEnosDeskNavbar && shareEnabled && chat && \(chat\.id \|\| \$temporaryChatEnabled\)}[\s\S]*<Menu[\s\S]*id="chat-title-menu-button"/,
		'The chat title trigger should reuse the existing chat action menu only on Desk'
	);
	assert.match(
		menu,
		/export let align = 'end'/,
		'The shared chat action menu should keep end alignment by default for the ellipsis button'
	);
	assert.match(
		menu,
		/<Dropdown[\s\S]*align={align}/,
		'The shared chat action menu should pass configurable alignment through to Dropdown'
	);
	assert.match(
		navbar,
		/<Menu[\s\S]*align="start"[\s\S]*id="chat-title-menu-button"/,
		'The ENOS Desk title menu should align from the title trigger start so the card opens under the title arrow area'
	);
	assert.match(
		navbar,
		/<ChevronDown/,
		'The chat title trigger should show a dropdown affordance'
	);
	assert.match(
		navbar,
		/{:else if showModelSelector}[\s\S]*<ModelSelector bind:selectedModels showSetDefault={!shareEnabled} \/>/,
		'Non-Desk navbar rendering should fall back to the existing model selector branch'
	);
	assert.match(
		navbarInvocation,
		/bind:selectedModels/,
		'Chat should keep model selection bound for the normal web navbar path'
	);
	assert.match(
		navbarInvocation,
		/showModelSelector={false}/,
		'Chat should keep the existing web behavior of hiding the navbar model selector'
	);
});
