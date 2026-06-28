<script lang="ts">
	// ENOS model avatar: a clean flat circle with the model's initial, tinted with
	// the model's brand color (Subconscious=orange, Conscious=coral, Ego=teal).
	// Mirrors UserAvatar (which owns brand sage for the user) so model and user
	// nodes share one visual language — a flat initials circle, not a glossy orb.
	import { enosOrbToneForModel, type EnosOrbTone } from '$lib/enos/modelTier';

	export let name: string | null | undefined = '';
	export let modelId: string | null | undefined = '';
	export let className = 'size-7';

	const TONE_VAR: Record<EnosOrbTone, string> = {
		orange: 'var(--enos-brand-orange)',
		coral: 'var(--enos-brand-coral)',
		teal: 'var(--enos-brand-teal)',
		sage: 'var(--enos-brand-sage)',
		all: '#9ca3af' // neutral gray when the model has no mind attribution
	};

	$: bg = TONE_VAR[enosOrbToneForModel(modelId)];

	$: initials =
		(name || '')
			.trim()
			.split(/\s+/)
			.map((w) => w[0] || '')
			.slice(0, 2)
			.join('')
			.toUpperCase() || 'M';
</script>

<div
	class="{className} shrink-0 rounded-full text-white flex items-center justify-center font-medium leading-none select-none"
	style="background-color: {bg}"
	aria-hidden="true"
>
	<span class="text-xs">{initials}</span>
</div>
