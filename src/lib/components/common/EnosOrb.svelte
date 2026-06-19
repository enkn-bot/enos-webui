<script lang="ts">
	// Tasteful ENOS breathing-orb loader. Served from /static (cached once) and
	// animated by the SVG's own embedded CSS, so it costs nothing to render.
	export let size = 28;
	export let className = '';
	export let label = 'Working…';
</script>

<img
	src="/enos-loader.svg"
	alt={label}
	aria-label={label}
	width={size}
	height={size}
	class="enos-orb inline-block select-none {className}"
	draggable="false"
	style="width: {size}px; height: {size}px;"
/>
