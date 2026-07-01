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
		// Single source of truth: the trigger's kind/label come from the picker's
		// reactive `triggerKind` slot prop, NOT a parallel Chat-derived badge — so the
		// chip can never disagree with the menu's checkmark (the divergence bug).
		expect(navbar).toContain('let:triggerKind');
		expect(navbar).toContain('workspaceKindLabel(triggerKind)');
		expect(navbar).toContain('<ChevronDown');
		expect(navbar).toContain('deskWorkspaceEmptyLabel()');
		// Binary current-location: badge shows env when there's a live location (kind),
		// not merely when a name exists. F1 separation: purely-local projects don't
		// appear on web at all, so the old "read-only / continue in cloud" dead-end
		// badge state is REMOVED — the badge is just the location label + a chevron.
		expect(navbar).toContain('{#if triggerKind != null}');
		expect(navbar).not.toContain('deskWorkspaceReadOnly');
		expect(navbar).not.toContain("$i18n.t('read-only')");
		expect(navbar).toContain('Select workspace…');
		expect(navbar).toContain('id="desk-workspace-status-button"');
	});

	test('picker offers local/cloud plus cloud environment management', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');

		expect(picker).toContain('showDeskFolderPicker.set(true)');
		expect(picker).toContain('ENOS Cloud');
		expect(picker).toContain('cloudEnvironmentLabel');
		expect(picker).toContain('ENOS Cloud');
		expect(picker).toContain('Add ENOS Cloud environment...');
		expect(picker).toContain('showCreateCloudEnvironmentModal');
		expect(picker).toContain('New ENOS Cloud environment');
		expect(picker).toContain('Network access');
		expect(picker).toContain('Environment variables');
		expect(picker).toContain('Setup script');
		expect(picker).toContain('createCloudEnvironment');
		expect(picker).toContain('createCloudWorkspace');
		expect(picker).not.toContain('Add cloud space');
		// GitHub is not an environment row.
		expect(picker).not.toContain('Connect GitHub');
		expect(picker).not.toContain('connectGithubAccount');
		expect(picker).not.toContain('cloneRepoIntoWorkspace');
		expect(picker).not.toContain('owner/repo');
		expect(picker).not.toContain('listGithubRepos');
		// Clean model: cloud = ENOS-managed ws-* only; no external terminal clutter.
		expect(picker).toContain("startsWith('ws-')");
		// Environment rows are concise: no terminal/source sublabels.
		expect(picker).not.toContain('Cloud terminal');
		expect(picker).not.toContain('directLabel');
	});

	test('web Desk hides the unavailable Local row', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');

		expect(picker).toContain('webDeskCloudLocked = !hasDesktopBridge');
		expect(picker).toMatch(/\{#if !webDeskCloudLocked\}[\s\S]*\$i18n\.t\('Local'\)[\s\S]*\{\/if\}/);
		expect(picker).not.toContain('disabled={!hasDesktopBridge}');
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
		// The trigger chip reads the SAME reactive currentLocation via deskBadgeKind,
		// exposed as a slot prop — one source feeds both menu checkmark and chip.
		expect(picker).toMatch(/triggerKind = deskBadgeKind\(\{[\s\S]*location: currentLocation/);
		expect(picker).toContain('<slot {triggerKind}');
		expect(picker).toMatch(/\{#if isLocalActive\}[\s\S]*<Check/);
		expect(picker).not.toMatch(/\{#if isLocalBound\}[\s\S]*<Check/);
	});

	test('selecting Local deactivates the cloud workspace (mutually exclusive)', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(picker).toContain('notifyDesktopBridgeActive');
		expect(picker).toContain('restoreLocalWorkspaceToFolder');
		expect(picker).toContain('chooseLocalWorkspaceForFolder');
		expect(picker).toMatch(
			/selectLocal[\s\S]*notifyDesktopBridgeActive\(\)[\s\S]*await deactivateCloudWorkspace\(\)/
		);
		expect(picker).toContain('deactivateCloudWorkspace');
		expect(picker).toMatch(/selectLocal[\s\S]*await deactivateCloudWorkspace\(\)/);
		expect(picker).toMatch(/deactivateCloudWorkspace[\s\S]*selectedTerminalId\.set\(null\)/);
		expect(chat).toContain('handleDesktopBridgeActive');
		expect(chat).toContain("window.addEventListener('enos:desktop-bridge-active'");
	});

	test('cloud-to-local switching does not use the generic rebind confirmation copy', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');

		expect(picker).not.toContain('Work locally?');
		expect(picker).not.toContain(
			'ENOS Cloud files stay in ENOS Cloud until a local copy is added.'
		);
		expect(picker).toContain('Local folder not found');
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
