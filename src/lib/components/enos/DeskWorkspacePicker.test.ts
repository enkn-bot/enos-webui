import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Desk workspace picker source contract', () => {
	test('navbar empty workspace state opens the desk workspace picker', () => {
		const navbar = read('src/lib/components/chat/Navbar.svelte');

		expect(navbar).toContain('<DeskWorkspacePicker bind:show={showDeskWorkspacePicker}>');
		// Environment-only badge: a kind icon + the environment label + a chevron,
		// with a "Select" fallback when nothing is bound. (Replaced the old <Plus
		// add-button — you are ALWAYS in an environment, so it reads the env, not "add".)
		expect(navbar).not.toContain('<Plus');
		expect(navbar).toContain('deskWorkspaceKindLabel');
		expect(navbar).toContain('<ChevronDown');
		expect(navbar).toContain('deskWorkspaceEmptyLabel()');
		// Binary current-location: badge shows env when there's a live location (kind),
		// not merely when a name exists; read-only marker for a local project that can't
		// be reached here (web, no bridge).
		expect(navbar).toContain('hasDeskWorkspace = deskWorkspace?.kind != null');
		expect(navbar).toContain('deskWorkspaceReadOnly');
		expect(navbar).toContain("$i18n.t('read-only')");
		expect(navbar).toContain('Select workspace…');
		expect(navbar).toContain('{#if hasDeskWorkspace}');
		expect(navbar).toContain('id="desk-workspace-status-button"');
	});

	test('picker offers only the local/cloud environment decision', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');

		expect(picker).toContain('showDeskFolderPicker.set(true)');
		expect(picker).toContain('Cloud');
		// S5: provision an ENOS-managed cloud workspace via the control-plane API.
		// One cloud workspace per user → the create action only shows when none exists,
		// gated on systemTerminals.length === 0 (no confusing "New" beside an existing one).
		expect(picker).toContain('Set up cloud workspace');
		expect(picker).toMatch(/\{#if systemTerminals\.length === 0\}/);
		expect(picker).toContain('createCloudWorkspace');
		expect(picker).toContain('on:click={createCloud}');
		// GitHub is not an environment row.
		expect(picker).not.toContain('Connect GitHub');
		expect(picker).not.toContain('connectGithubAccount');
		expect(picker).not.toContain('cloneRepoIntoWorkspace');
		expect(picker).not.toContain('owner/repo');
		expect(picker).not.toContain('listGithubRepos');
		// Clean model: cloud = ENOS-managed ws-* only; the base "Add cloud
		// environment…" external-terminal clutter is gone from the ENOS picker.
		expect(picker).not.toContain('Add cloud environment');
		expect(picker).toContain("startsWith('ws-')");
		// Environment rows are concise: no terminal/source sublabels.
		expect(picker).not.toContain('Cloud terminal');
		expect(picker).not.toContain('directLabel');
	});

	test('Local row keeps binary active-location check without project-source detail', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		// Source detail moved into the project menu.
		expect(picker).toContain('workspaceBadgeFromFolder(activeFolder)');
		expect(picker).toContain('isLocalBound = hasDesktopBridge');
		expect(picker).not.toContain('{boundBadge.name}');
		// But the ✓ tracks the binary current location, not mere binding existence —
		// so Local + Cloud can't both show a check at once.
		expect(picker).toContain('deskCurrentLocation');
		expect(picker).toContain("isLocalActive = currentLocation === 'local'");
		expect(picker).toMatch(/\{#if isLocalActive\}[\s\S]*<Check/);
		expect(picker).not.toMatch(/\{#if isLocalBound\}[\s\S]*<Check/);
	});

	test('selecting Local deactivates the cloud workspace (mutually exclusive)', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(picker).toContain('notifyDesktopBridgeActive');
		expect(picker).toMatch(/selectLocal[\s\S]*notifyDesktopBridgeActive\(\)[\s\S]*await deactivateCloudWorkspace\(\)/);
		expect(picker).toContain('deactivateCloudWorkspace');
		expect(picker).toMatch(/selectLocal[\s\S]*await deactivateCloudWorkspace\(\)/);
		expect(picker).toMatch(/deactivateCloudWorkspace[\s\S]*selectedTerminalId\.set\(null\)/);
		expect(chat).toContain('handleDesktopBridgeActive');
		expect(chat).toContain("window.addEventListener('enos:desktop-bridge-active'");
	});

	test('project menu does not expose GitHub account or clone plumbing', () => {
		const menu = read('src/lib/components/enos/DeskProjectMenu.svelte');

		expect(menu).toContain('projectStatusLabel');
		expect(menu).not.toContain('bindGithubRepoToFolder');
		expect(menu).not.toContain('Select or create a project before cloning a repo.');
		expect(menu).not.toContain('cloneRepo');
		expect(menu).not.toContain('Connect GitHub');
		expect(menu).not.toContain('owner/repo');
	});
});
