<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import * as topojson from 'topojson-client';

	let {
		countriesGeo,
		birds,
		oldRecord,
		species,
		meta,
		t = $bindable(0),
		playing = $bindable(false),
		reducedMotion = false
	} = $props();

	let svgEl = $state(null);
	let containerEl = $state(null);
	let width = $state(800);
	let height = $state(600);
	let frameIndex = $state(0);
	let animationId = $state(null);
	let reliefDataUrl = $state(null);
	let reliefReady = $state(false);

	const FRAME_COUNT = 4;
	const FRAME_RATE = 8;
	const DURATION_S = 17;
	const FPS = 30;
	const TOTAL_FRAMES = DURATION_S * FPS;
	const HOLD_FRAMES = 2 * FPS;
	const FLIGHT_FRAMES = TOTAL_FRAMES - HOLD_FRAMES;

	// Relief source bounds (equirectangular crop of Natural Earth SR_50M)
	const RELIEF_BOUNDS = { west: -170, east: -50, north: 72, south: 5 };

	// Full resolution for clean hillshade
	const RELIEF_SCALE = 1;

	// Continental NA + Mexico + Central America (no Caribbean, no South America)
	const NA_IDS = new Set([
		'124', // Canada
		'840', // United States
		'484', // Mexico
		'320', // Guatemala
		'084', // Belize
		'340', // Honduras
		'222', // El Salvador
		'558', // Nicaragua
		'188', // Costa Rica
		'591'  // Panama
	]);

	const CITIES = [
		{ name: 'Anchorage', lng: -149.90, lat: 61.22, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Vancouver', lng: -123.12, lat: 49.28, anchor: 'end', dx: -6, dy: 4 },
		{ name: 'Seattle', lng: -122.33, lat: 47.61, anchor: 'end', dx: -6, dy: 4 },
		{ name: 'San Francisco', lng: -122.42, lat: 37.77, anchor: 'end', dx: -6, dy: 0 },
		{ name: 'Los Angeles', lng: -118.24, lat: 34.05, anchor: 'end', dx: -6, dy: 4 },
		{ name: 'Denver', lng: -104.99, lat: 39.74, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Chicago', lng: -87.63, lat: 41.88, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'New York', lng: -74.01, lat: 40.71, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Houston', lng: -95.37, lat: 29.76, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Mexico City', lng: -99.13, lat: 19.43, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Guadalajara', lng: -103.35, lat: 20.67, anchor: 'end', dx: -6, dy: 4 },
	];

	const framePaths = [
		'/art/hummingbird/frame-01.svg',
		'/art/hummingbird/frame-02.svg',
		'/art/hummingbird/frame-03.svg',
		'/art/hummingbird/frame-04.svg'
	];

	// Filter out polygon rings whose centroid is in excluded zones (Hawaii, Pacific islands)
	function clipContinental(geom) {
		function ringCentroid(ring) {
			let sumLng = 0, sumLat = 0;
			for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; }
			return [sumLng / ring.length, sumLat / ring.length];
		}

		// Exclude: west of -130 AND south of 50 (Hawaii, Pacific islands)
		// Exclude: east of -50 (Atlantic territories)
		function isContinental([lng, lat]) {
			if (lng < -130 && lat < 50) return false;
			if (lng > -50) return false;
			return true;
		}

		if (geom.type === 'Polygon') {
			const c = ringCentroid(geom.coordinates[0]);
			return isContinental(c) ? geom : { type: 'Polygon', coordinates: [] };
		}
		if (geom.type === 'MultiPolygon') {
			const kept = geom.coordinates.filter((poly) => isContinental(ringCentroid(poly[0])));
			return { type: 'MultiPolygon', coordinates: kept };
		}
		return geom;
	}

	function resolveCoord(point) {
		if (point.lat === 'TODO' || point.lng === 'TODO') return null;
		return [point.lng, point.lat];
	}

	function fallbackCoord(bird, which) {
		const coord = resolveCoord(bird[which]);
		if (coord) return coord;
		if (which === 'start') return [-148.5, 60.8];
		if (bird.id === 'record') return [-103.3, 20.7];
		return [-110, 30];
	}

	const recordBird = $derived(birds.find((b) => b.id === 'record'));
	const otherBirds = $derived(birds.filter((b) => b.id !== 'record'));

	const mapState = $derived.by(() => {
		if (!countriesGeo || !width) return null;

		// Filter to NA/CA countries only
		const naGeometries = countriesGeo.objects.countries.geometries.filter(
			(g) => NA_IDS.has(String(g.id))
		);

		// Merged land outline (dissolves internal borders → coastline only)
		const naLandRaw = topojson.merge(countriesGeo, naGeometries);

		// Remove Hawaii, Pacific islands, Atlantic territories
		const naLand = clipContinental(naLandRaw);

		// Internal borders between NA countries
		const naBordersRaw = topojson.mesh(countriesGeo, countriesGeo.objects.countries, (a, b) =>
			a !== b && NA_IDS.has(String(a.id)) && NA_IDS.has(String(b.id))
		);
		const naBorders = naBordersRaw;

		// Projection: conic equal area fitted to the land so it fills the frame
		const pad = 10;
		const projection = d3
			.geoConicEqualArea()
			.center([0, 40])
			.rotate([100, 0])
			.parallels([25, 55])
			.fitExtent(
				[
					[pad, pad],
					[width - pad, height - pad]
				],
				{ type: 'Feature', geometry: naLand }
			);

		const path = d3.geoPath(projection);
		const naLandPath = path(naLand);
		const naBorderPath = path(naBorders);

		function makeRoute(bird) {
			const start = fallbackCoord(bird, 'start');
			const end = fallbackCoord(bird, 'end');
			const interp = d3.geoInterpolate(start, end);
			const points = d3.range(0, 1.005, 0.005).map((t) => projection(interp(t)));
			return { points, start, end, interp, bird };
		}

		const recordRoute = makeRoute(recordBird);

		// Dev check: great-circle distance sanity
		if (typeof window !== 'undefined') {
			const R = 6371;
			const [lng1, lat1] = recordRoute.start;
			const [lng2, lat2] = recordRoute.end;
			const dLat = ((lat2 - lat1) * Math.PI) / 180;
			const dLng = ((lng2 - lng1) * Math.PI) / 180;
			const a =
				Math.sin(dLat / 2) ** 2 +
				Math.cos((lat1 * Math.PI) / 180) *
					Math.cos((lat2 * Math.PI) / 180) *
					Math.sin(dLng / 2) ** 2;
			const gc = 2 * R * Math.asin(Math.sqrt(a));
			const pctOff = Math.abs(gc - recordBird.distanceKm) / recordBird.distanceKm;
			if (pctOff > 0.01) {
				console.warn(
					`[HummingbirdMap] Great-circle distance ${Math.round(gc)} km is ${(pctOff * 100).toFixed(1)}% off recorded ${recordBird.distanceKm} km (using fallback coords)`
				);
			}
		}

		return { naLand, naLandPath, naBorderPath, projection, path, recordRoute };
	});

	const line = d3
		.line()
		.x((d) => d[0])
		.y((d) => d[1])
		.curve(d3.curveCatmullRom);

	const flightT = $derived(Math.min(t * (TOTAL_FRAMES / FLIGHT_FRAMES), 1));

	const birdPos = $derived.by(() => {
		if (!mapState) return null;
		const geoPos = mapState.recordRoute.interp(flightT);
		return mapState.projection(geoPos);
	});

	const birdAngle = $derived.by(() => {
		if (!mapState) return 0;
		const interp = mapState.recordRoute.interp;
		const t0 = Math.max(0, flightT - 0.01);
		const t1 = Math.min(1, flightT + 0.01);
		const p0 = mapState.projection(interp(t0));
		const p1 = mapState.projection(interp(t1));
		if (!p0 || !p1) return 0;
		return (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI;
	});

	const recordStartPos = $derived(mapState?.projection(fallbackCoord(recordBird, 'start')) ?? null);
	const recordEndPos = $derived(mapState?.projection(fallbackCoord(recordBird, 'end')) ?? null);
	const gulfLabelPos = $derived(mapState?.projection([-145, 53]) ?? null);

	const cityPositions = $derived.by(() => {
		if (!mapState) return [];
		return CITIES.map((c) => {
			const pos = mapState.projection([c.lng, c.lat]);
			return pos ? { ...c, x: pos[0], y: pos[1] } : null;
		}).filter(Boolean);
	});

	const counterKm = $derived(Math.round(flightT * recordBird.distanceKm));
	const counterMi = $derived(Math.round(flightT * recordBird.distanceMi));
	const counterText = $derived.by(() => {
		if (flightT >= 1) return `${recordBird.distanceMi.toLocaleString()} miles, at least`;
		return `${counterMi.toLocaleString()} mi`;
	});

	const partialRecordPath = $derived.by(() => {
		if (!mapState) return '';
		const pts = mapState.recordRoute.points;
		const endIdx = Math.round(flightT * (pts.length - 1));
		const partial = pts.slice(0, endIdx + 1).filter((p) => p);
		if (partial.length < 2) return '';
		return line(partial);
	});


	// Render shaded relief at reduced resolution, then scale up via SVG <image>
	function renderRelief(img, projection, fullW, fullH) {
		const w = Math.ceil(fullW / RELIEF_SCALE);
		const h = Math.ceil(fullH / RELIEF_SCALE);

		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');

		// Pre-fill white so JPEG gaps aren't black
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, w, h);

		// Read source pixels
		const srcCanvas = document.createElement('canvas');
		srcCanvas.width = img.naturalWidth;
		srcCanvas.height = img.naturalHeight;
		const srcCtx = srcCanvas.getContext('2d');
		srcCtx.drawImage(img, 0, 0);
		const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height).data;

		const imgW = srcCanvas.width;
		const imgH = srcCanvas.height;
		const { west, east, north, south } = RELIEF_BOUNDS;
		const lonRange = east - west;
		const latRange = north - south;

		// Read back the pre-filled canvas so we write on top of the base color
		const outData = ctx.getImageData(0, 0, w, h);
		const out = outData.data;

		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				// Map reduced-res pixel back to full-res projection coordinates
				const coords = projection.invert([x * RELIEF_SCALE, y * RELIEF_SCALE]);
				if (!coords) continue;

				const [lon, lat] = coords;
				if (lon < west || lon > east || lat < south || lat > north) continue;

				const sx = Math.floor(((lon - west) / lonRange) * imgW);
				const sy = Math.floor(((north - lat) / latRange) * imgH);
				if (sx < 0 || sx >= imgW || sy < 0 || sy >= imgH) continue;

				const srcIdx = (sy * imgW + sx) * 4;
				const idx = (y * w + x) * 4;
				const raw = srcData[srcIdx];
				const n = raw / 255; // 0–1 normalized

				// Strong hillshade: dark warm shadows, white highlights
				// Shadows: rgb(130, 120, 105)  Highlights: rgb(255, 255, 255)
				out[idx]     = 130 + n * 125; // R
				out[idx + 1] = 120 + n * 135; // G
				out[idx + 2] = 105 + n * 150; // B
				out[idx + 3] = 255;
			}
		}

		ctx.putImageData(outData, 0, 0);
		return canvas.toDataURL('image/jpeg', 0.85);
	}

	let reliefImg = null;
	let lastReliefKey = '';

	onMount(() => {
		if (reducedMotion) t = 1;

		reliefImg = new Image();
		reliefImg.onload = () => {
			reliefReady = true;
			if (mapState) {
				reliefDataUrl = renderRelief(reliefImg, mapState.projection, width, height);
				lastReliefKey = `${width}x${height}`;
			}
		};
		reliefImg.src = '/data/relief-na.jpg';

		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newW = Math.round(entry.contentRect.width);
				if (newW !== width) {
					width = newW;
					// Landscape on desktop, taller on mobile
					const ratio = newW >= 900 ? 0.56 : newW >= 600 ? 0.7 : 0.9;
					height = Math.round(Math.max(newW * ratio, 400));
				}
			}
		});
		if (containerEl) ro.observe(containerEl);

		return () => {
			ro.disconnect();
			if (animationId) cancelAnimationFrame(animationId);
		};
	});

	// Re-render relief only when size actually changes
	$effect(() => {
		if (!reliefReady || !reliefImg || !mapState || !width || !height) return;
		const key = `${width}x${height}`;
		if (key === lastReliefKey) return;
		lastReliefKey = key;
		reliefDataUrl = renderRelief(reliefImg, mapState.projection, width, height);
	});

	function play() {
		if (reducedMotion) { t = 1; return; }
		playing = true;
		t = 0;
		let lastFrameTime = 0;
		const startTime = performance.now();
		function tick(now) {
			const elapsed = (now - startTime) / 1000;
			t = Math.min(elapsed / DURATION_S, 1);
			// Cycle wingbeat frames during flight
			if (now - lastFrameTime > 1000 / FRAME_RATE) {
				frameIndex = (frameIndex + 1) % FRAME_COUNT;
				lastFrameTime = now;
			}
			if (t < 1) {
				animationId = requestAnimationFrame(tick);
			} else {
				playing = false;
				animationId = null;
			}
		}
		animationId = requestAnimationFrame(tick);
	}

	function stop() {
		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		playing = false;
	}

	function replay() {
		stop();
		play();
	}
</script>

<div class="hummingbird-map" bind:this={containerEl} style:height="{height}px">
	{#if mapState}
		<svg
			bind:this={svgEl}
			viewBox="0 0 {width} {height}"
			{width}
			{height}
			role="img"
			aria-label="Map showing the record Rufous Hummingbird migration route from Alaska toward Mexico"
		>
			<defs>
				<clipPath id="land-clip">
					<path d={mapState.naLandPath} />
				</clipPath>
			</defs>

			<!-- Background matches page -->
			<rect x="0" y="0" {width} {height} fill="var(--bg, #fffdf8)" />

			<!-- Base land fill (white) -->
			<path d={mapState.naLandPath} fill="#ffffff" />

			<!-- Shaded relief overlay (clipped to NA land) -->
			{#if reliefDataUrl}
				<image
					href={reliefDataUrl}
					x="0" y="0"
					{width} {height}
					clip-path="url(#land-clip)"
					preserveAspectRatio="none"
				/>
			{/if}

			<!-- Country borders -->
			<path
				d={mapState.naBorderPath}
				fill="none"
				stroke="#9a9080"
				stroke-width="1"
				stroke-linejoin="round"
			/>

			<!-- Coastline -->
			<path
				d={mapState.naLandPath}
				fill="none"
				stroke="#6a6050"
				stroke-width="1.25"
				stroke-linejoin="round"
			/>

			<!-- Water labels -->
			{#if gulfLabelPos}
				<text
					x={gulfLabelPos[0]}
					y={gulfLabelPos[1]}
					class="water-label"
					text-anchor="middle"
				>Gulf of Alaska</text>
			{/if}

			<!-- Cities -->
			{#each cityPositions as city}
				<circle cx={city.x} cy={city.y} r="2" fill="#5a5550" />
				<text
					x={city.x + city.dx}
					y={city.y + city.dy}
					class="city-label"
					text-anchor={city.anchor}
				>{city.name}</text>
			{/each}

			<!-- Record route (cobalt, drawn progressively) -->
			{#if partialRecordPath}
				<path
					d={partialRecordPath}
					fill="none"
					stroke="var(--accent, #3b4fd9)"
					stroke-width="2.5"
					stroke-linecap="round"
				/>
			{/if}

			<!-- Start dot (always visible) -->
			{#if recordStartPos}
				<circle cx={recordStartPos[0]} cy={recordStartPos[1]} r="5" fill="var(--accent, #3b4fd9)" />
				<circle cx={recordStartPos[0]} cy={recordStartPos[1]} r="5" fill="none" stroke="#fff" stroke-width="1.5" />
			{/if}

			<!-- End dot (appears when bird arrives) -->
			{#if flightT >= 1 && recordEndPos}
				<circle cx={recordEndPos[0]} cy={recordEndPos[1]} r="5" fill="var(--accent, #3b4fd9)" />
				<circle cx={recordEndPos[0]} cy={recordEndPos[1]} r="5" fill="none" stroke="#fff" stroke-width="1.5" />
				<text x={recordEndPos[0]} y={recordEndPos[1] + 18} class="map-label" text-anchor="middle" fill="var(--accent, #3b4fd9)" font-weight="700">
					{recordBird.end.label}
				</text>
			{/if}


			<!-- Bird sprite -->
			{#if birdPos}
				<g transform="translate({birdPos[0]}, {birdPos[1]}) {flightT < 1 ? `rotate(${birdAngle})` : ''}">
					<image
						href={framePaths[frameIndex]}
						x="-20"
						y="-10"
						width="40"
						height="20"
					/>
				</g>
			{/if}

			<!-- Counter -->
			<text x={width - 16} y={height - 50} class="counter" text-anchor="end">
				{counterText}
			</text>
			<text x={width - 16} y={height - 30} class="counter-km" text-anchor="end">
				{counterKm.toLocaleString()} km
			</text>

			<!-- Disclaimers -->
			<text x={16} y={height - 30} class="disclaimer">
				Straight-line minimum. The real path was longer and isn't known.
			</text>
			<text x={16} y={height - 14} class="disclaimer">Time not to scale</text>

			<!-- Source -->
			<text x={width - 16} y={height - 10} class="source" text-anchor="end">
				{meta.source}
			</text>
		</svg>

		<!-- Controls -->
		<div class="controls">
			{#if !playing && t === 0}
				<button class="pill play-btn" onclick={play}>Play</button>
			{:else if !playing && t >= 1}
				<button class="pill play-btn" onclick={replay}>Replay</button>
			{:else if playing}
				<button class="pill play-btn" onclick={stop}>Pause</button>
			{/if}
		</div>
	{:else}
		<div class="loading">Loading map&hellip;</div>
	{/if}
</div>

<style>
	.hummingbird-map {
		position: relative;
		width: 100%;
		background: var(--bg, #fffdf8);
		overflow: hidden;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.city-label {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 10px;
		fill: #5a5550;
	}

	.water-label {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 12px;
		font-style: italic;
		fill: #8a9aaa;
		letter-spacing: 0.08em;
	}

	.counter {
		font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
		font-size: 28px;
		font-weight: 800;
		fill: var(--accent, #3b4fd9);
	}

	.counter-km {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 14px;
		fill: #4a4540;
		opacity: 0.7;
	}

	.map-label {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 11px;
		fill: #4a4540;
	}

	.disclaimer {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 10px;
		fill: #4a4540;
		opacity: 0.5;
	}

	.source {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 9px;
		fill: #4a4540;
		opacity: 0.4;
	}

	.controls {
		position: absolute;
		bottom: 12px;
		left: 50%;
		transform: translateX(-50%);
	}

	.play-btn {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 0.875rem;
		font-weight: 700;
		padding: 8px 24px;
		height: 40px;
		border-radius: var(--radius-pill, 999px);
		border: 1.5px solid #4a4540;
		background: rgba(242, 238, 228, 0.9);
		color: #4a4540;
		cursor: pointer;
		backdrop-filter: blur(4px);
	}

	.play-btn:hover {
		background: #4a4540;
		color: #f2eee4;
	}

	.loading {
		padding: 4rem;
		text-align: center;
		font-family: var(--font-body, 'Karla', sans-serif);
		color: #4a4540;
		opacity: 0.5;
	}

	@media (prefers-reduced-motion: reduce) {
		.play-btn {
			transition: none;
		}
	}
</style>
