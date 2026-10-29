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

	// Render relief at 2.5x viewport so it stays pixel-crisp at max camera zoom
	const RELIEF_SCALE = 0.4;

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
		{ name: 'Whitehorse', lng: -135.05, lat: 60.72, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Calgary', lng: -114.07, lat: 51.05, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Winnipeg', lng: -97.14, lat: 49.90, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Toronto', lng: -79.38, lat: 43.65, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Vancouver', lng: -123.12, lat: 49.28, anchor: 'end', dx: -6, dy: 4 },
		{ name: 'Seattle', lng: -122.33, lat: 47.61, anchor: 'end', dx: -6, dy: 4 },
		{ name: 'San Francisco', lng: -122.42, lat: 37.77, anchor: 'end', dx: -6, dy: 0 },
		{ name: 'Los Angeles', lng: -118.24, lat: 34.05, anchor: 'end', dx: -6, dy: 4 },
		{ name: 'Denver', lng: -104.99, lat: 39.74, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'Chicago', lng: -87.63, lat: 41.88, anchor: 'start', dx: 6, dy: 4 },
		{ name: 'New York', lng: -74.01, lat: 40.71, anchor: 'start', dx: 6, dy: 4 },
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
		// On mobile, fit to the western route corridor so the west coast is larger
		const pad = width < 600 ? 2 : 10;
		const fitTarget = width < 600
			? { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[
				[-155, 72], [-80, 72], [-80, 8], [-155, 8], [-155, 72]
			]] } }
			: { type: 'Feature', geometry: naLand };

		const projection = d3
			.geoConicEqualArea()
			.center([0, 40])
			.rotate([100, 0])
			.parallels([25, 55]);

		if (width < 600) {
			// "Cover" fit: fill the container completely
			// 1. Fit to extent (fills width, may leave vertical whitespace)
			projection.fitExtent([[pad, pad], [width - pad, height - pad]], fitTarget);
			// 2. If projected height < container, scale up to fill height
			const b = d3.geoPath(projection).bounds(fitTarget);
			const projH = b[1][1] - b[0][1];
			const containerH = height - 2 * pad;
			if (projH < containerH) {
				const up = containerH / projH * 0.85;
				projection.scale(projection.scale() * up);
				// 3. Center horizontally, pin top vertically
				const nb = d3.geoPath(projection).bounds(fitTarget);
				const [tx, ty] = projection.translate();
				const projW = nb[1][0] - nb[0][0];
				const cx = (width - projW) / 2 - nb[0][0];
				projection.translate([tx + cx, ty + (pad - nb[0][1])]);
			}
		} else {
			projection.fitExtent(
				[[pad, pad], [width - pad, height - pad]],
				fitTarget
			);
		}

		const path = d3.geoPath(projection);
		const naLandPath = path(naLand);
		const naBorderPath = path(naBorders);

		function makeRoute(bird) {
			const start = fallbackCoord(bird, 'start');
			const end = fallbackCoord(bird, 'end');
			const waypoints = bird.waypoints
				? bird.waypoints.map((w) => [w.lng, w.lat])
				: [];

			// Build full coordinate list: start → waypoints → end
			const allCoords = [start, ...waypoints, end];
			const waypointData = bird.waypoints || [];

			// Generate interpolated points along each segment
			const segments = [];
			for (let i = 0; i < allCoords.length - 1; i++) {
				const segInterp = d3.geoInterpolate(allCoords[i], allCoords[i + 1]);
				const steps = d3.range(0, 1, 0.02).map((t) => segInterp(t));
				segments.push(steps);
			}
			// Add final point
			segments[segments.length - 1].push(allCoords[allCoords.length - 1]);

			// Flatten all segments into one point array
			const allGeoPoints = segments.flat();
			const points = allGeoPoints.map((p) => projection(p));

			// Build a combined interpolator that walks along all segments
			function interp(t) {
				const totalSegs = allCoords.length - 1;
				const seg = Math.min(Math.floor(t * totalSegs), totalSegs - 1);
				const segT = (t * totalSegs) - seg;
				return d3.geoInterpolate(allCoords[seg], allCoords[seg + 1])(segT);
			}

			return { points, allCoords, waypointData, start, end, interp, bird };
		}

		const recordRoute = makeRoute(recordBird);

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

	// t value where flightT reaches 1 (bird arrives)
	const T_ARRIVAL = FLIGHT_FRAMES / TOTAL_FRAMES;

	function cameraAt(tVal, ft, bp, w, h) {
		const mapCenter = [w / 2, h / 2];
		const ZOOM = 2.5;

		if (ft < 1) {
			// Zoomed in, following bird
			return { cx: bp[0], cy: bp[1], scale: ZOOM };
		} else {
			// Bird has arrived — ease out during hold frames
			const holdProgress = (tVal - T_ARRIVAL) / (1 - T_ARRIVAL);
			const p = d3.easeCubicInOut(Math.min(holdProgress, 1));
			return {
				cx: bp[0] + (mapCenter[0] - bp[0]) * p,
				cy: bp[1] + (mapCenter[1] - bp[1]) * p,
				scale: ZOOM + (1 - ZOOM) * p
			};
		}
	}

	const MOBILE_IDLE_ZOOM = 1.15;
	const camera = $derived.by(() => {
		if (!mapState || !birdPos) return { cx: width / 2, cy: height / 2, scale: 1 };
		// Show overview before animation starts — slight zoom on mobile
		if (!playing && t === 0) {
			if (width < 600) {
				return { cx: width / 2, cy: height / 2, scale: MOBILE_IDLE_ZOOM };
			}
			return { cx: width / 2, cy: height / 2, scale: 1 };
		}
		return cameraAt(t, flightT, birdPos, width, height);
	});

	const cameraTransform = $derived(
		`translate(${width / 2}, ${height / 2}) scale(${camera.scale}) translate(${-camera.cx}, ${-camera.cy})`
	);

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
	const startLabelPos = $derived(mapState?.projection([-158, 53]) ?? null);

	// Waypoint positions with their t-values (evenly spaced across segments)
	const waypointPositions = $derived.by(() => {
		if (!mapState) return [];
		const route = mapState.recordRoute;
		const totalSegs = route.allCoords.length - 1;
		return route.waypointData.map((wp, i) => {
			const pos = mapState.projection([wp.lng, wp.lat]);
			// Waypoint i is at t = (i + 1) / totalSegs
			const wpT = (i + 1) / totalSegs;
			return pos ? { ...wp, x: pos[0], y: pos[1], t: wpT } : null;
		}).filter(Boolean);
	});

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

	// Midpoint along the route curve (for end-state label)
	const routeMidPos = $derived.by(() => {
		if (!mapState) return null;
		const geoMid = mapState.recordRoute.interp(0.5);
		return mapState.projection(geoMid);
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
					// Landscape on desktop, portrait on mobile
					const ratio = newW >= 900 ? 0.56 : newW >= 600 ? 0.7 : 1.6;
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

<div class="hummingbird-map" bind:this={containerEl}>
	{#if mapState}
		<!-- Controls: above map on mobile, overlaid at bottom on desktop -->
		<div class="controls">
			{#if !playing && t === 0}
				<span class="controls-hint">Press play to follow the flight</span>
				<button class="pill play-btn" onclick={play} aria-label="Play"><svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor"><polygon points="0,0 14,8 0,16" /></svg></button>
			{:else if !playing && t >= 1}
				<button class="pill play-btn" onclick={replay} aria-label="Replay"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v4h4" /><path d="M3 6a6 6 0 1 1 1 7" /></svg></button>
			{:else if playing}
				<button class="pill play-btn" onclick={stop} aria-label="Pause"><svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><rect x="0" y="0" width="4" height="14" /><rect x="8" y="0" width="4" height="14" /></svg></button>
			{/if}
		</div>
		<svg
			bind:this={svgEl}
			viewBox="0 0 {width} {height}"
			role="img"
			aria-label="Map showing the record Rufous Hummingbird migration route from Alaska toward Mexico"
		>
			<defs>
				<clipPath id="land-clip">
					<path d={mapState.naLandPath} />
				</clipPath>
				<clipPath id="viewport-clip">
					<rect x="0" y="0" {width} {height} />
				</clipPath>
				{#if width < 600}
					<linearGradient id="east-fade" x1="0.5" x2="1" y1="0" y2="0">
						<stop offset="0%" stop-color="var(--bg, #fffdf8)" stop-opacity="0" />
						<stop offset="100%" stop-color="var(--bg, #fffdf8)" stop-opacity="0.85" />
					</linearGradient>
					<linearGradient id="top-fade" x1="0" x2="0" y1="0" y2="0.15">
						<stop offset="0%" stop-color="var(--bg, #fffdf8)" stop-opacity="0.75" />
						<stop offset="100%" stop-color="var(--bg, #fffdf8)" stop-opacity="0" />
					</linearGradient>
				{/if}
			</defs>

			<!-- Background matches page (fixed) -->
			<rect x="0" y="0" {width} {height} fill="var(--bg, #fffdf8)" />

			<!-- Camera group: pans and zooms to follow the bird -->
			<g clip-path="url(#viewport-clip)" transform={cameraTransform}>
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
					stroke-width={1 / camera.scale}
					stroke-linejoin="round"
				/>

				<!-- Coastline -->
				<path
					d={mapState.naLandPath}
					fill="none"
					stroke="#6a6050"
					stroke-width={1.25 / camera.scale}
					stroke-linejoin="round"
				/>

				<!-- Water labels -->
				{#if gulfLabelPos}
					{#if width >= 600}
						<text
							x={gulfLabelPos[0]}
							y={gulfLabelPos[1]}
							class="water-label"
							text-anchor="middle"
							font-size="{12 / camera.scale}px"
						>Gulf of Alaska</text>
					{:else}
						<text
							x={gulfLabelPos[0]}
							y={gulfLabelPos[1] - 6 / camera.scale}
							class="water-label"
							text-anchor="middle"
							font-size="{10 / camera.scale}px"
						>Gulf of</text>
						<text
							x={gulfLabelPos[0]}
							y={gulfLabelPos[1] + 6 / camera.scale}
							class="water-label"
							text-anchor="middle"
							font-size="{10 / camera.scale}px"
						>Alaska</text>
					{/if}
				{/if}

				<!-- Cities -->
				{#each cityPositions as city}
					<circle cx={city.x} cy={city.y} r={2 / camera.scale} fill="#5a5550" />
					<!-- White halo to knock out map lines behind label -->
					<text
						x={city.x + city.dx / camera.scale}
						y={city.y + city.dy / camera.scale}
						class="city-label-halo"
						text-anchor={city.anchor}
						font-size="{10 / camera.scale}px"
						stroke-width={3 / camera.scale}
					>{city.name}</text>
					<text
						x={city.x + city.dx / camera.scale}
						y={city.y + city.dy / camera.scale}
						class="city-label"
						text-anchor={city.anchor}
						font-size="{10 / camera.scale}px"
					>{city.name}</text>
				{/each}

				<!-- Record route (cobalt, drawn progressively) -->
				{#if partialRecordPath}
					<path
						d={partialRecordPath}
						fill="none"
						stroke="var(--accent, #3b4fd9)"
						stroke-width={3 / camera.scale}
						stroke-linecap="round"
					/>
				{/if}

				<!-- Start dot (always visible) -->
				{#if recordStartPos}
					<circle cx={recordStartPos[0]} cy={recordStartPos[1]} r={7 / camera.scale} fill="var(--brick, #b5523b)" />
					<circle cx={recordStartPos[0]} cy={recordStartPos[1]} r={7 / camera.scale} fill="none" stroke="#fff" stroke-width={2 / camera.scale} />
				{/if}

				<!-- Start label with curved arrow (in the Gulf of Alaska) -->
				{#if recordStartPos && startLabelPos}
					{@const s = Math.min(width / 800, 1)}
					{#if width >= 600}
						<text x={startLabelPos[0]} y={startLabelPos[1]} class="endpoint-label" text-anchor="end" font-size="{12 / camera.scale}px" font-weight="700" fill="var(--brick, #b5523b)">Alaska Wildlife Conservation Center</text>
						<text x={startLabelPos[0]} y={startLabelPos[1] + 14 / camera.scale} class="endpoint-label" text-anchor="end" font-size="{10 / camera.scale}px" fill="var(--brick, #b5523b)">Portage, AK</text>
					{:else}
						<text x={startLabelPos[0]} y={startLabelPos[1]} class="endpoint-label" text-anchor="end" font-size="{11 / camera.scale}px" font-weight="700" fill="var(--brick, #b5523b)">AWCC</text>
						<text x={startLabelPos[0]} y={startLabelPos[1] + 12 / camera.scale} class="endpoint-label" text-anchor="end" font-size="{9 / camera.scale}px" fill="var(--brick, #b5523b)">Portage, AK</text>
					{/if}
					<!-- Curved arrow: offsets scaled by viewport ratio for consistent proportions -->
					<path
						d="M {startLabelPos[0] + 4 * s} {startLabelPos[1] + 18 * s} C {startLabelPos[0] + 40 * s} {startLabelPos[1] + 35 * s} {recordStartPos[0]} {recordStartPos[1] + 50 * s} {recordStartPos[0]} {recordStartPos[1] + 16 * s}"
						fill="none"
						stroke="var(--brick, #b5523b)"
						stroke-width="1.25"
						vector-effect="non-scaling-stroke"
					/>
					<!-- Arrowhead pointing north, counter-scaled for constant visual size -->
					<g transform="translate({recordStartPos[0]}, {recordStartPos[1] + 16 * s}) scale({1 / camera.scale})">
						<polygon points="0,-5 -4,5 4,5" fill="var(--brick, #b5523b)" />
					</g>
				{/if}

				<!-- Waypoint dots (appear as bird passes) -->
				{#each waypointPositions as wp}
					{#if flightT >= wp.t}
						<circle cx={wp.x} cy={wp.y} r={5.5 / camera.scale} fill="var(--accent, #3b4fd9)" />
						<circle cx={wp.x} cy={wp.y} r={5.5 / camera.scale} fill="none" stroke="#fff" stroke-width={1.5 / camera.scale} />
						<text x={wp.x + 10 / camera.scale} y={wp.y + 5 / camera.scale} class="waypoint-label-halo" font-size="{13 / camera.scale}px" font-weight="700" stroke-width={3 / camera.scale}>{wp.label}</text>
						<text x={wp.x + 10 / camera.scale} y={wp.y + 5 / camera.scale} class="waypoint-label" font-size="{13 / camera.scale}px" font-weight="700">{wp.label}</text>
					{/if}
				{/each}

				<!-- End dot (appears when bird arrives) -->
				{#if flightT >= 1 && recordEndPos}
					<circle cx={recordEndPos[0]} cy={recordEndPos[1]} r={8 / camera.scale} fill="var(--brick, #b5523b)" />
					<circle cx={recordEndPos[0]} cy={recordEndPos[1]} r={8 / camera.scale} fill="none" stroke="#fff" stroke-width={2 / camera.scale} />
					<text x={recordEndPos[0]} y={recordEndPos[1] + 24 / camera.scale} class="endpoint-label" text-anchor="middle" fill="var(--brick, #b5523b)" font-weight="800" font-size="{15 / camera.scale}px">
						{recordBird.end.label}
					</text>
				{/if}

				<!-- Distance annotations (appear at end) -->
				{#if flightT >= 1 && recordStartPos && recordEndPos}
					<!-- Straight-line dotted line -->
					<line
						x1={recordStartPos[0]} y1={recordStartPos[1]}
						x2={recordEndPos[0]} y2={recordEndPos[1]}
						stroke="var(--ink, #22211f)"
						stroke-width="1.5"
						stroke-dasharray="4 3"
						vector-effect="non-scaling-stroke"
						opacity="0.45"
					/>
					<!-- Straight-line label -->
					<text
						x={(recordStartPos[0] + recordEndPos[0]) / 2 + 12 / camera.scale}
						y={(recordStartPos[1] + recordEndPos[1]) / 2}
						class="distance-label"
						font-size="{11 / camera.scale}px"
						font-weight="700"
					>{recordBird.distanceKm.toLocaleString()} km straight line</text>

				{/if}

				<!-- Bird sprite -->
				{#if birdPos}
					<g transform="translate({birdPos[0]}, {birdPos[1]}) scale({1 / camera.scale}) {flightT < 1 ? `rotate(${birdAngle})` : ''}">
						<image
							href={framePaths[frameIndex]}
							x="-20"
							y="-10"
							width="40"
							height="20"
						/>
					</g>
				{/if}
			</g>

			<!-- Fade edges on mobile -->
			{#if width < 600}
				<rect x={width * 0.5} y="0" width={width * 0.5} {height} fill="url(#east-fade)" />
				<rect x="0" y="0" {width} height={height * 0.15} fill="url(#top-fade)" />
			{/if}

			<!-- Fixed HUD (not transformed by camera) -->
			<text x={width - 16} y={height - 14} class="source" text-anchor="end">
				{meta.source}
			</text>
		</svg>

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
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.waypoint-label-halo {
		font-family: var(--font-body, 'Karla', sans-serif);
		fill: none;
		stroke: var(--bg, #fffdf8);
		paint-order: stroke;
	}

	.waypoint-label {
		font-family: var(--font-body, 'Karla', sans-serif);
		fill: var(--accent, #3b4fd9);
	}

	.city-label-halo {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-weight: 700;
		fill: none;
		stroke: #ffffff;
		stroke-linejoin: round;
	}

	.city-label {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-weight: 700;
		fill: #5a5550;
	}

	.water-label {
		font-family: var(--font-body, 'Karla', sans-serif);
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
		fill: #4a4540;
	}

	.distance-label {
		font-family: var(--font-body, 'Karla', sans-serif);
		fill: var(--ink, #22211f);
		opacity: 0.55;
	}

	.route-distance {
		fill: var(--accent, #3b4fd9);
		opacity: 0.8;
	}

	.endpoint-label {
		font-family: var(--font-body, 'Karla', sans-serif);
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
		text-align: center;
		padding: 12px 0 16px;
		order: -1;
	}

	@media (min-width: 600px) {
		.controls {
			position: absolute;
			bottom: 12px;
			left: 50%;
			transform: translateX(-50%);
			padding: 0;
			order: unset;
		}
	}

	.controls-hint {
		display: block;
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 0.8rem;
		color: #4a4540;
		opacity: 0.6;
		margin-bottom: 10px;
	}

	.play-btn {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 0.875rem;
		font-weight: 700;
		padding: 6px 16px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
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
