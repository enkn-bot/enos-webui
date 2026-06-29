<!-- enos-webui_link/src/lib/components/enos/LocalTerminal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Terminal } from '@xterm/xterm';
	import { FitAddon } from '@xterm/addon-fit';
	import { WebLinksAddon } from '@xterm/addon-web-links';
	import '@xterm/xterm/css/xterm.css';

	import { getEnosDesktopBridge } from '$lib/enos/desktopBridge';
	import { resolveTerminalTheme, resolveTerminalFont } from '$lib/enos/terminalTheme';

	export let folderId: string | null = null;
	export let overlay = false;

	let terminalEl: HTMLDivElement;
	let term: Terminal | null = null;
	let fitAddon: FitAddon | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let sessionId: string | null = null;
	let offData: (() => void) | null = null;
	let offExit: (() => void) | null = null;

	const localTerminal = () => getEnosDesktopBridge()?.localTerminal ?? null;

	onMount(async () => {
		term = new Terminal({
			cursorBlink: true,
			fontSize: 13,
			fontFamily: resolveTerminalFont(),
			theme: resolveTerminalTheme(),
			allowProposedApi: true,
			scrollback: 5000
		});
		fitAddon = new FitAddon();
		term.loadAddon(fitAddon);
		term.loadAddon(new WebLinksAddon());
		term.open(terminalEl);
		requestAnimationFrame(() => fitAddon?.fit());

		const lt = localTerminal();
		if (!lt) {
			term.write('\r\n\x1b[31mLocal terminal is only available in the ENOS desktop app.\x1b[0m\r\n');
			return;
		}

		// Renderer owns the sessionId so the listeners are registered before any
		// data can arrive (no race with start()).
		sessionId = crypto.randomUUID();

		offData = lt.onData((payload: any) => {
			if (payload?.sessionId === sessionId && term) term.write(payload.data);
		});
		offExit = lt.onExit((payload: any) => {
			if (payload?.sessionId === sessionId && term) {
				term.write(
					payload.error
						? `\r\n\x1b[31m[${payload.error}]\x1b[0m\r\n`
						: '\r\n\x1b[90m[process exited]\x1b[0m\r\n'
				);
			}
		});

		await lt.start(sessionId, folderId, term.cols, term.rows);

		term.onData((data) => {
			if (sessionId) lt.write(sessionId, data);
		});
		term.attachCustomKeyEventHandler(() => true);
		term.onResize(({ cols, rows }) => {
			if (sessionId) lt.resize(sessionId, cols, rows);
		});

		resizeObserver = new ResizeObserver(() => requestAnimationFrame(() => fitAddon?.fit()));
		resizeObserver.observe(terminalEl);
		term.focus();
	});

	onDestroy(() => {
		offData?.();
		offExit?.();
		const lt = localTerminal();
		if (lt && sessionId) lt.kill(sessionId);
		resizeObserver?.disconnect();
		term?.dispose();
		term = null;
		fitAddon = null;
	});
</script>

<div class="h-full min-h-0 relative" style="background: {resolveTerminalTheme().background}">
	<div bind:this={terminalEl} class="absolute inset-0 px-0.5" class:pointer-events-none={overlay} />
</div>
