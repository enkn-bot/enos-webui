<script lang="ts">
	// ENOS user avatar: sage circle with initials. Sage is the brand's 4th color
	// (the other three are taken by the model tiers), reserved for the user.
	// Rendered instead of the server's opaque generated initials-PNG so the
	// brand sage actually shows.
	export let name: string | null | undefined = '';
	export let className = 'size-7';

	$: initials =
		(name || '')
			.trim()
			.split(/\s+/)
			.map((w) => w[0] || '')
			.slice(0, 2)
			.join('')
			.toUpperCase() || 'E';
</script>

<div
	class="{className} shrink-0 rounded-full bg-[var(--enos-brand-sage)] text-white flex items-center justify-center font-medium leading-none select-none"
	aria-hidden="true"
>
	<span class="text-xs">{initials}</span>
</div>
