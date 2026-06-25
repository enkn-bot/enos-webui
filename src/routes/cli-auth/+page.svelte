<script lang="ts">
	import { onMount } from 'svelte';

	import { buildCliAuthPost, getCliAuthToken } from '$lib/enos/cliAuth';

	let status = 'Connecting ENOS Terminal...';
	let detail = 'Return to your terminal when this finishes.';
	let failed = false;

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const redirect = params.get('redirect') ?? '';
		const state = params.get('state') ?? '';
		const sessionValue = getCliAuthToken({
			localStorageToken: localStorage.getItem('token'),
			cookie: document.cookie
		});

		if (!sessionValue) {
			const returnPath = `${window.location.pathname}${window.location.search}`;
			window.location.href = `/auth?redirect=${encodeURIComponent(returnPath)}`;
			return;
		}

		try {
			const request = buildCliAuthPost({ redirect, state, token: sessionValue });
			const res = await fetch(request.url, request.init);
			if (!res.ok) {
				throw new Error((await res.text().catch(() => '')) || `Callback failed (${res.status})`);
			}
			status = 'Terminal signed in';
			detail = 'You can close this tab and return to ENOS Terminal.';
		} catch (error) {
			failed = true;
			status = 'Terminal sign-in failed';
			detail =
				error instanceof Error
					? error.message
					: 'Run enos login again, or use enos login --key.';
		}
	});
</script>

<svelte:head>
	<title>ENOS Terminal Sign In</title>
</svelte:head>

<div class="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
	<div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
		<div class="space-y-3">
			<div class="text-sm font-medium uppercase tracking-wide text-gray-400">
				ENOS Terminal
			</div>
			<h1 class="text-3xl font-semibold">{status}</h1>
			<p class="text-base leading-7 {failed ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}">
				{detail}
			</p>
		</div>
	</div>
</div>
