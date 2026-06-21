import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('ENOS UI cleanup source ownership', () => {
	test('Placeholder owns the welcome greeting without surface DOM injection', () => {
		const placeholder = read('src/lib/components/chat/Placeholder.svelte');
		const surface = read('static/static/enos-surface.mjs');

		expect(placeholder).toContain("import { composeWelcomeGreeting } from '$lib/enos/greeting'");
		expect(placeholder).toContain('const welcomeGreeting = composeWelcomeGreeting');
		expect(placeholder).toContain('id="enos-welcome-greeting"');
		expect(surface).not.toMatch(
			/composeWelcomeGreeting|ensureWelcomeGreeting|findWelcomeNameRow|enos-welcome-greeting/
		);
	});

	test('composer keeps attachments and ENOS model picker while removing integrations tools and cloud controls', () => {
		const messageInput = read('src/lib/components/chat/MessageInput.svelte');
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(messageInput).toContain('<InputMenu');
		expect(messageInput).toContain('id="input-menu-button"');
		expect(messageInput).toContain('<ModelPicker');
		expect(messageInput).not.toContain('<IntegrationsMenu');
		expect(messageInput).not.toContain('id="integration-menu-button"');
		expect(messageInput).not.toContain('aria-label="Available Tools"');
		expect(messageInput).not.toContain('<TerminalMenu');
		expect(chat).toMatch(/webSearchEnabled\s*=\s*true/);
	});

	test('chat navbar gates header chrome by surface and removes header avatars', () => {
		const navbar = read('src/lib/components/chat/Navbar.svelte');
		const sidebar = read('src/lib/components/layout/Sidebar.svelte');
		const userMenu = read('src/lib/components/layout/Sidebar/UserMenu.svelte');
		const appCss = read('src/app.css');
		const staticCss = read('static/static/custom.css');

		expect(navbar).toContain("window.location.hostname === 'enosdesk.duckdns.org'");
		expect(navbar).toContain('isDeskSurface &&');
		expect(navbar).not.toContain('WEBUI_API_BASE_URL');
		expect(navbar).not.toContain('<UserMenu');
		expect(navbar).toContain('id="desk-workspace-status-button"');
		expect(navbar).toContain('Select workspace…');
		expect(navbar).toContain('onRenameChat');
		expect(navbar).toContain('on:dblclick');
		// Sage user avatar is rendered via UserAvatar (initials on sage circle),
		// not an inline bg on the server's opaque generated PNG.
		const userAvatar = read('src/lib/components/enos/UserAvatar.svelte');
		expect(userAvatar).toContain('bg-[var(--enos-brand-sage)]');
		expect(sidebar).toContain('<UserAvatar');
		expect(userMenu).toContain('<UserAvatar');
		expect(appCss).toContain('--enos-brand-sage: #a4b672');
		expect(staticCss).not.toContain('button[aria-label="User menu"]');
	});

	test('loader orbs are wired to active model loading states', () => {
		const skeleton = read('src/lib/components/chat/Messages/Skeleton.svelte');
		const responseMessage = read('src/lib/components/chat/Messages/ResponseMessage.svelte');
		const statusHistory = read('src/lib/components/chat/Messages/ResponseMessage/StatusHistory.svelte');
		const statusItem = read(
			'src/lib/components/chat/Messages/ResponseMessage/StatusHistory/StatusItem.svelte'
		);
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(skeleton).toContain('<EnosOrb');
		expect(skeleton).toContain('modelId');
		expect(responseMessage).toContain('<Skeleton modelId={message.model} />');
		expect(responseMessage).toContain('<StatusHistory statusHistory={message?.statusHistory} modelId={message.model} />');
		expect(statusHistory).toContain('<StatusItem {status} {modelId}');
		expect(statusItem).toContain('<EnosOrb');
		expect(chat).toContain('<EnosOrb tone="all"');
	});
});
