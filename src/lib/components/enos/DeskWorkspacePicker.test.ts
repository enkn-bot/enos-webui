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
		expect(navbar).toContain("$i18n.t('Select')");
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

	test('picker offers local, cloud-workspace create, and a live GitHub connect (S5)', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');

		expect(picker).toContain('showDeskFolderPicker.set(true)');
		expect(picker).toContain('Desktop only');
		expect(picker).toContain('Cloud');
		// S5: provision an ENOS-managed cloud workspace via the control-plane API.
		expect(picker).toContain('New cloud workspace');
		expect(picker).toContain('createCloudWorkspace');
		expect(picker).toContain('on:click={createCloud}');
		// S5: GitHub is now a live OAuth connect (no longer a disabled "Coming soon").
		expect(picker).toContain('Connect GitHub');
		expect(picker).toContain('connectGithubAccount');
		expect(picker).not.toContain('Coming soon');
		// S5: when connected, a repo input clones owner/repo into the workspace.
		expect(picker).toContain('cloneRepoIntoWorkspace');
		expect(picker).toContain('cloneRepo');
		expect(picker).toContain('owner/repo');
		// Cloud rows still read as a compute terminal, not the project's file home.
		expect(picker).toContain('Cloud terminal');
	});

	test('Local row shows the bound folder name, but the ✓ marks the ACTIVE location (binary)', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		// Sublabel still shows the folder name when bound (context).
		expect(picker).toContain('workspaceBadgeFromFolder(activeFolder)');
		expect(picker).toContain('{:else if isLocalBound}');
		expect(picker).toContain('{boundBadge.name}');
		// But the ✓ tracks the binary current location, not mere binding existence —
		// so Local + Cloud can't both show a check at once.
		expect(picker).toContain('deskCurrentLocation');
		expect(picker).toContain('isLocalActive = currentLocation === \'local\'');
		expect(picker).toMatch(/\{#if isLocalActive\}[\s\S]*<Check/);
		expect(picker).not.toMatch(/\{#if isLocalBound\}[\s\S]*<Check/);
	});

	test('selecting Local deactivates the cloud workspace (mutually exclusive)', () => {
		const picker = read('src/lib/components/enos/DeskWorkspacePicker.svelte');
		expect(picker).toContain('deactivateCloudWorkspace');
		expect(picker).toMatch(/selectLocal[\s\S]*await deactivateCloudWorkspace\(\)/);
		expect(picker).toMatch(/deactivateCloudWorkspace[\s\S]*selectedTerminalId\.set\(null\)/);
	});
});
