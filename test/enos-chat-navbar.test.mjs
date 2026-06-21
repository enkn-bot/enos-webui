import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('chat navbar exposes Desk title actions and workspace status only on ENOS Desk', () => {
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
		/window\.location\.hostname === 'enosdesk\.duckdns\.org'/,
		'Navbar should gate Desk-only header UI on the ENOS Desk hostname'
	);
	assert.match(
		navbar,
		/let isDeskSurface = false/,
		'Navbar should default to the normal web behavior until Desk hostname detection runs'
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
		/export let onRenameChat/,
		'Navbar should accept an inline rename callback for Desk title editing'
	);
	assert.match(
		navbar,
		/export let deskWorkspaceName/,
		'Navbar should accept the selected Desk workspace label'
	);
	assert.match(
		navbar,
		/id="chat-title-menu-button"/,
		'Navbar should expose a dedicated chat title menu trigger'
	);
	assert.match(
		navbar,
		/{#if isDeskSurface && shareEnabled && chat && \(chat\.id \|\| \$temporaryChatEnabled\)}[\s\S]*<Menu[\s\S]*id="chat-title-menu-button"/,
		'The chat title trigger should reuse the existing chat action menu only on Desk'
	);
	assert.match(
		navbar,
		/on:dblclick\|preventDefault\|stopPropagation=\{beginTitleRename\}/,
		'The Desk title trigger should enter inline rename on double-click'
	);
	assert.match(
		navbar,
		/id="chat-title-rename-input"/,
		'The Desk title should expose an inline rename input'
	);
	assert.match(
		navbar,
		/id="desk-workspace-status-button"[\s\S]*\{deskWorkspaceLabel\(\)\}/,
		'Desk should show the selected workspace name or selection prompt in the top-right'
	);
	assert.match(
		navbar,
		/Select workspace…/,
		'Desk should show a pre-selection workspace prompt when no workspace is selected'
	);
	assert.doesNotMatch(
		navbar,
		/<UserMenu|WEBUI_API_BASE_URL/,
		'Navbar should not render the header user avatar/menu'
	);
	assert.match(
		navbar,
		/{#if isDeskSurface && \(\$user\?\.role === 'admin' \|\| \(\$user\?\.permissions\.chat\?\.controls \?\? true\)\)}/,
		'The top-right controls/expand button should remain Desk-only'
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
	assert.match(
		navbarInvocation,
		/onRenameChat=\{renameChatHandler\}/,
		'Chat should wire Desk inline rename through the existing chat API'
	);
	assert.match(
		navbarInvocation,
		/deskWorkspaceName=\{String\(/,
		'Chat should pass the selected Desk workspace label into Navbar'
	);
});
