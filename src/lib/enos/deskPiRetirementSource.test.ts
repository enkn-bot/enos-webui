import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Desk Pi transport naming', () => {
	test('Chat routes cloud and local Desk through Pi-named handlers', () => {
		const chat = read('src/lib/components/chat/Chat.svelte');

		expect(chat).toContain('handleCloudPiChat(userPrompt, cloudWsId)');
		expect(chat).toContain('handleLocalPiChat(');
		expect(chat).toContain('runDeskPiTurn');
		expect(chat).toContain('desktopPiTransport(pi, folderId)');
		expect(chat).toContain('handleLocalPiChat(userPrompt, folderId, bridge.pi)');
		expect(chat).toContain('canUseEnosLocalPi');
		expect(chat).not.toContain('handleCloudOpencodeChat');
		expect(chat).not.toContain('handleLocalOpencodeChat');
		expect(chat).not.toContain('bridge.opencode');
	});

	test('desktop bridge exposes Pi RPC, not the retired OpenCode bridge', () => {
		const bridge = read('src/lib/enos/desktopBridge.ts');

		expect(bridge).toContain('piRpc?: boolean');
		expect(bridge).toContain('pi?: EnosDesktopPiBridge');
		expect(bridge).toContain('canUseEnosLocalPi');
		expect(bridge).not.toContain('opencodeServe');
		expect(bridge).not.toContain('deskEngine');
		expect(bridge).not.toContain('EnosDesktopOpencode');
	});

	test('transport module is Pi-only and has no dead OpenCode engine branch', () => {
		const transport = read('src/lib/enos/deskPiTransport.ts');

		expect(transport).toContain('runDeskPiTurn');
		expect(transport).toContain('normalizePiEvent');
		expect(transport).toContain('/prompt');
		expect(transport).not.toContain('/session');
		expect(transport).not.toContain('normalizeLegacyOpencodeEvent');
		expect(transport).not.toContain("engine?: 'pi' | 'opencode'");
	});
});
