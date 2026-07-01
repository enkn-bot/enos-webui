import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('ENOS uses one notification visual system for Sonner and app update toasts', () => {
	const rootLayout = read('src/routes/+layout.svelte');
	const appLayout = read('src/routes/(app)/+layout.svelte');
	const appCss = read('src/app.css');
	const notificationToast = read('src/lib/components/NotificationToast.svelte');

	assert.match(
		appCss,
		/\[data-sonner-toast\]\[data-styled='true'\][\s\S]*border-radius: 1\.5rem[\s\S]*\.dark \[data-sonner-toast\]\[data-styled='true'\][\s\S]*--color-gray-850[\s\S]*--color-gray-800/,
		'Default Sonner toasts should inherit the ENOS NotificationToast light/dark card treatment'
	);
	assert.doesNotMatch(
		rootLayout,
		/\btoast:\s*['"`]/,
		'Global Sonner classes should not wrap custom NotificationToast instances in a second card'
	);
	assert.match(
		rootLayout,
		/<Toaster[\s\S]*toastOptions=\{toastOptions\}/,
		'The global Toaster should apply the ENOS toast style contract to ordinary toast.success/error/info calls'
	);

	assert.match(
		appLayout,
		/import NotificationToast from '\$lib\/components\/NotificationToast\.svelte'/,
		'The app layout should use the same NotificationToast component for version update prompts'
	);
	assert.doesNotMatch(
		appLayout,
		/UpdateInfoToast|<div class=" absolute bottom-8 right-8 z-50"/,
		'The old separately styled bottom-right update toast should not remain active'
	);
	assert.match(
		appLayout,
		/toast\.custom\(NotificationToast,[\s\S]*unstyled: true/,
		'Version update prompts should be routed through the same custom toast surface'
	);

	assert.match(
		notificationToast,
		/role="button"[\s\S]*tabindex="0"/,
		'The clickable NotificationToast surface should expose interactive semantics'
	);
});
