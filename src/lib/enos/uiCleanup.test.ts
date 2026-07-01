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

		// Surface detection is centralized in deskRuntime (single source of truth).
		expect(navbar).toContain("import { isDeskHostname } from '$lib/enos/deskRuntime';");
		expect(navbar).toContain('isDeskHostname()');
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

	test('per-message loaders use the calm base treatment, not brand orbs', () => {
		const skeleton = read('src/lib/components/chat/Messages/Skeleton.svelte');
		const statusItem = read(
			'src/lib/components/chat/Messages/ResponseMessage/StatusHistory/StatusItem.svelte'
		);
		const chat = read('src/lib/components/chat/Chat.svelte');

		// Per-message loading uses base OWUI's pulsing dot / shimmer. The brand orb was
		// pulled out of message skeletons and status items to calm the narration UI —
		// it kept re-spinning on every status and read as noisy.
		expect(skeleton).toContain('animate-pulse');
		expect(skeleton).toContain('animate-size');
		expect(skeleton).not.toContain('<EnosOrb');
		expect(statusItem).not.toContain('<EnosOrb');
		// The brand orb still anchors the single standalone loading mark (not per message).
		expect(chat).toContain('<EnosOrb tone="all"');
	});

	test('display headings use the formalized serif token class, not hardcoded fonts', () => {
		const placeholder = read('src/lib/components/chat/Placeholder.svelte');
		const folderTitle = read('src/lib/components/chat/Placeholder/FolderTitle.svelte');
		const appCss = read('src/app.css');

		// Greeting + project title share ONE serif display treatment AND one size,
		// via the .enos-display (serif token) + .enos-landing-title (size) classes,
		// so the two landing titles are always identical.
		expect(placeholder).toContain(
			'class="enos-display enos-landing-title mb-3 @md:mb-4 max-w-2xl px-5 text-center text-gray-900 dark:text-gray-50"'
		);
		expect(placeholder).not.toContain("font-family: 'Anthropic Serif'");
		expect(folderTitle).toContain('enos-display enos-landing-title line-clamp-1');
		expect(placeholder).not.toContain("$selectedFolder ? 'mt-8'");
		// The serif treatment is defined off the secondary (serif) token, not a hardcoded family.
		expect(appCss).toMatch(/\.enos-display\s*\{[^}]*font-family:\s*var\(--font-secondary\)/);
		// Single source of truth for the landing-title size.
		expect(appCss).toMatch(/\.enos-landing-title\s*\{[^}]*font-size:/);
	});

	test('project landing sits on the same visual band as the welcome landing', () => {
		const placeholder = read('src/lib/components/chat/Placeholder.svelte');

		expect(placeholder).toMatch(
			/Project view:[\s\S]*class="m-auto w-full max-w-6xl px-2 @2xl:px-20 translate-y-14 py-24 text-center"/
		);
		expect(placeholder).toMatch(
			/Greeting view[\s\S]*class="m-auto w-full max-w-6xl px-2 @2xl:px-20 translate-y-6 py-24 text-center"/
		);
	});

	test('decorative emojis are removed from empty states and settings chrome', () => {
		const emptyStateFiles = [
			'src/routes/(app)/automations/+page.svelte',
			'src/lib/components/admin/Functions.svelte',
			'src/lib/components/workspace/Prompts.svelte',
			'src/lib/components/workspace/Models.svelte',
			'src/lib/components/workspace/Tools.svelte',
			'src/lib/components/workspace/Knowledge.svelte',
			'src/lib/components/admin/Evaluations/Feedbacks.svelte',
			'src/lib/components/workspace/Skills.svelte',
			'src/lib/components/admin/Settings/Models.svelte',
			'src/lib/components/admin/Users/Groups.svelte'
		];

		for (const file of emptyStateFiles) {
			expect(read(file)).not.toMatch(/[⚡😕📝👥]/);
		}

		const generalSettings = read('src/lib/components/chat/Settings/General.svelte');
		expect(generalSettings).not.toMatch(/[⚙🌑🌃☀🌷]/);

		const userMenu = read('src/lib/components/layout/Sidebar/UserMenu.svelte');
		expect(userMenu).not.toContain('✨');

		const userList = read('src/lib/components/admin/Users/UserList.svelte');
		expect(userList).not.toMatch(/[👋🌱💛👉]/);
	});
});
