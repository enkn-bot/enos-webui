<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {{ key?: string, center?: number[], zoom?: number, markers?: {lng:number,lat:number,label?:string}[], title?: string, route?: number[][] }} */
	export let data = {};

	let container;
	let mapInstance = null;
	let resizeObserver = null;
	let error = '';

	const SDK_VERSION = '6.25.0';
	const CSS_URL = `https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/${SDK_VERSION}/maps/maps.css`;
	const JS_URL = `https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/${SDK_VERSION}/maps/maps-web.min.js`;

	function loadCss() {
		if (document.querySelector(`link[href="${CSS_URL}"]`)) return;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = CSS_URL;
		document.head.appendChild(link);
	}

	function loadSdk() {
		return new Promise((resolve, reject) => {
			if (window.tt) return resolve(window.tt);
			let s = document.querySelector(`script[src="${JS_URL}"]`);
			if (s) {
				s.addEventListener('load', () => resolve(window.tt));
				s.addEventListener('error', reject);
				return;
			}
			s = document.createElement('script');
			s.src = JS_URL;
			s.async = true;
			s.addEventListener('load', () => resolve(window.tt));
			s.addEventListener('error', reject);
			document.head.appendChild(s);
		});
	}

	onMount(async () => {
		const key = data?.key;
		const center = Array.isArray(data?.center) && data.center.length === 2 ? data.center : null;
		if (!key || !center) {
			error = 'map unavailable';
			return;
		}
		try {
			loadCss();
			const tt = await loadSdk();
			mapInstance = tt.map({
				key,
				container,
				center,
				zoom: typeof data?.zoom === 'number' ? data.zoom : 14
			});
			mapInstance.addControl(new tt.NavigationControl());
			// Optional route line (directions): draw once the style is ready. Coords
			// are [lng, lat] pairs from the maps tool, downsampled server-side.
			const route = Array.isArray(data?.route) && data.route.length > 1 ? data.route : null;
			if (route) {
				const drawRoute = () => {
					if (!mapInstance || mapInstance.getSource('enos-route')) return;
					mapInstance.addLayer({
						id: 'enos-route',
						type: 'line',
						source: {
							type: 'geojson',
							data: {
								type: 'Feature',
								geometry: { type: 'LineString', coordinates: route }
							}
						},
						layout: { 'line-join': 'round', 'line-cap': 'round' },
						paint: { 'line-color': '#e07a3f', 'line-width': 4, 'line-opacity': 0.85 }
					});
				};
				if (mapInstance.isStyleLoaded && mapInstance.isStyleLoaded()) drawRoute();
				else mapInstance.on('load', drawRoute);
			}
			// The block renders mid-stream, so the map's initial tile paint often
			// doesn't fire even though the container is already sized. An explicit
			// resize() kicks the tile fetch/repaint; call it on load, on a short
			// timeout chain (unconditional — a no-op resize still triggers the
			// paint), and whenever the container later reflows.
			const kick = () => mapInstance && mapInstance.resize();
			mapInstance.on('load', kick);
			[0, 150, 400, 800].forEach((t) => setTimeout(kick, t));
			if (typeof ResizeObserver !== 'undefined') {
				resizeObserver = new ResizeObserver(kick);
				resizeObserver.observe(container);
			}
			const markers =
				Array.isArray(data?.markers) && data.markers.length
					? data.markers
					: [{ lng: center[0], lat: center[1] }];
			for (const m of markers) {
				if (typeof m?.lng !== 'number' || typeof m?.lat !== 'number') continue;
				const marker = new tt.Marker().setLngLat([m.lng, m.lat]).addTo(mapInstance);
				if (m.label) marker.setPopup(new tt.Popup({ offset: 30 }).setHTML(m.label));
			}
		} catch (e) {
			error = 'failed to load map';
		}
	});

	onDestroy(() => {
		if (resizeObserver) {
			try {
				resizeObserver.disconnect();
			} catch (e) {}
			resizeObserver = null;
		}
		if (mapInstance) {
			try {
				mapInstance.remove();
			} catch (e) {}
			mapInstance = null;
		}
	});
</script>

<div class="rounded-2xl border border-gray-100/30 dark:border-gray-850/30 overflow-hidden flex flex-col">
	{#if data?.title}
		<div class="px-4 py-3 border-b border-gray-100/30 dark:border-gray-850/30">
			<h2
				class="text-base font-semibold text-black dark:text-white"
				style="font-family: 'ENOS Serif', Georgia, serif;"
			>
				{data.title}
			</h2>
		</div>
	{/if}
	{#if error}
		<div class="p-4 text-sm text-gray-400 dark:text-gray-500 italic">{error}</div>
	{:else}
		<div class="relative">
			<div bind:this={container} class="w-full" style="height: 360px;"></div>
			{#if data?.summary}
				<!-- floating distance/time pill (directions) -->
				<div
					class="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-gray-100/60 dark:border-gray-850/60 bg-white/95 dark:bg-black/80 px-3 py-1.5 text-sm shadow-sm backdrop-blur"
				>
					<span class="text-gray-400 text-xs uppercase tracking-wide">
						{data.summary.modeVerb ?? 'Route'}
					</span>
					<b class="text-[15px] text-black dark:text-white">{data.summary.duration}</b>
					<span class="text-gray-400">· {data.summary.distance}</span>
				</div>
			{/if}
		</div>
		{#if data?.summary}
			<!-- summary row (directions) -->
			<div
				class="flex flex-wrap gap-x-7 gap-y-2 px-4 py-3 border-t border-gray-100/30 dark:border-gray-850/30 items-baseline"
			>
				<div>
					<div class="text-[11px] uppercase tracking-wide text-gray-400">Distance</div>
					<div class="text-lg font-semibold text-black dark:text-white">
						{data.summary.distance}
					</div>
				</div>
				<div>
					<div class="text-[11px] uppercase tracking-wide text-gray-400">Time</div>
					<div class="text-lg font-semibold text-black dark:text-white">
						{data.summary.duration}
					</div>
				</div>
				{#if data.summary.via}
					<div class="ml-auto text-right text-gray-400 text-sm max-w-[45%]">
						<div class="text-[11px] uppercase tracking-wide">Via</div>
						{data.summary.via}
					</div>
				{/if}
			</div>
		{/if}
		{#if data?.steps?.length}
			<!-- collapsible turn-by-turn (directions) -->
			<details class="border-t border-gray-100/30 dark:border-gray-850/30 group">
				<summary
					class="cursor-pointer list-none px-4 py-3 text-sm font-medium flex justify-between items-center select-none text-black dark:text-white"
				>
					<span>Turn-by-turn ({data.steps.length} steps)</span>
					<span class="text-gray-400 transition-transform group-open:rotate-180">▾</span>
				</summary>
				<ol
					class="px-4 pb-4 pl-9 text-sm leading-loose list-decimal marker:text-gray-400 text-black dark:text-white"
				>
					{#each data.steps as s}<li>{s}</li>{/each}
				</ol>
			</details>
		{/if}
	{/if}
</div>
