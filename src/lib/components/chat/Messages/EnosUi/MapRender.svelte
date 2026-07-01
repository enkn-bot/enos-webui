<script>
	import { onMount, onDestroy } from 'svelte';

	/** @type {{ key?: string, center?: number[], zoom?: number, markers?: {lng:number,lat:number,label?:string}[], title?: string }} */
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
			<h2 class="text-sm font-semibold text-black dark:text-white">{data.title}</h2>
		</div>
	{/if}
	{#if error}
		<div class="p-4 text-sm text-gray-400 dark:text-gray-500 italic">{error}</div>
	{:else}
		<div bind:this={container} class="w-full" style="height: 360px;"></div>
	{/if}
</div>
