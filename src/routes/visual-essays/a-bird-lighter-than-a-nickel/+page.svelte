<script>
	import { onMount } from 'svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import HummingbirdMap from '$lib/components/HummingbirdMap.svelte';

	let { data } = $props();

	const { hummingbird, countriesGeo } = data;
	const { birds, oldRecord, species, meta, tracking } = hummingbird;
	const record = birds.find((b) => b.id === 'record');

	let t = $state(0);
	let playing = $state(false);
	let reducedMotion = $state(false);

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// Allow ?t=0.5 for deterministic frame capture (client-side only)
		const tParam = new URL(window.location.href).searchParams.get('t');
		if (tParam !== null) {
			t = Math.max(0, Math.min(1, parseFloat(tParam)));
		}
	});
</script>

<OgMeta
	title={meta.title}
	description="A Rufous Hummingbird weighing less than a nickel was tracked flying {record.distanceMi.toLocaleString()} miles from Alaska toward Mexico — a new record."
	url="https://thewildplot.com/visual-essays/a-bird-lighter-than-a-nickel"
/>

<main class="story" style="--story-color: #23304a; --story-ink: #f6f0e2;">
	<header class="story-header">
		<div class="header-inner">
			<p class="eyebrow">Migration &middot; Birds</p>
			<h1>{meta.title}</h1>
			<p class="dek">
				A {species.name} weighing between {species.massG[0]} and {species.massG[1]}&nbsp;grams
				was tracked flying {record.distanceMi.toLocaleString()}&nbsp;miles from Alaska toward Mexico.
				That's at least {(record.bodyLengths.min / 1e6).toFixed(0)} million body lengths — a new record for the
				smallest migrating bird ever measured.
			</p>
			<p class="byline">By Zach Alexander</p>
		</div>
	</header>

	<section class="map-section">
		<HummingbirdMap
			{countriesGeo}
			{birds}
			{oldRecord}
			{species}
			{meta}
			bind:t
			bind:playing
			{reducedMotion}
		/>
	</section>

	<section class="context">
		<div class="context-inner">
			<h2>Three birds, one record</h2>
			<p>
				On June 24, 2026, a team led by USFWS biologist Todd Eskelin used fishing-line nets
				draped over feeders at the Alaska Wildlife Conservation Center in Portage to capture
				three Rufous Hummingbirds. Each bird got a silver ID band and a {tracking.transmitter}
				transmitter — a solar-powered tracker weighing {tracking.transmitterWeightG}&nbsp;grams,
				about the weight of a grain of rice.
			</p>
			<p>
				Within days, the birds pinged near Glacier Island and Seward. Some flew directly
				across the Gulf of Alaska rather than following the coastline, surprising researchers.
				Then the signals went quiet — until they started appearing thousands of miles south,
				picked up by hikers, rafters, and cruise ships whose phones detected the Bluetooth signal.
			</p>
			<p>
				The farthest bird's signal was picked up by a sensor station at Las Joyas,
				a research facility in Mexico's Sierra de Manantl&aacute;n Biosphere Reserve near Guadalajara —
				{record.distanceKm.toLocaleString()}&nbsp;km
				({record.distanceMi.toLocaleString()}&nbsp;miles) from where it was tagged.
			</p>

			<h2>The old record</h2>
			<p>
				The previous record stood since {oldRecord.year}. A second-year female Rufous,
				band number {oldRecord.bandNumber}, was banded by {oldRecord.bandedBy} at a home
				near {oldRecord.start.label} in January. That June, {oldRecord.recapturedBy} recaptured
				it {oldRecord.daysApart}&nbsp;days later in {oldRecord.end.label} —
				{oldRecord.distanceKm.toLocaleString()}&nbsp;km away.
				The new record exceeds it by {(record.distanceKm - oldRecord.distanceKm).toLocaleString()}&nbsp;km.
			</p>

			<h2>A species in decline</h2>
			<p>
				Rufous Hummingbird populations have declined by {species.populationDecline}.
				The {tracking.project} project, co-founded by Emma Rhodes and Kyle Shepard through the
				Banding Coalition of the Americas, aims to map the migration routes that sustain what's left
				of the population — and identify the stopover habitats they depend on.
			</p>
			<p>
				These distances are straight-line minimums between tagging and detection points.
				The actual paths were longer — and aren't known.
			</p>
		</div>
	</section>

	<section class="sources">
		<div class="sources-inner">
			<h3>Sources</h3>
			<ul>
				<li>{meta.source} — {meta.sourceNote}</li>
				<li>{species.source} — species mass and length</li>
				<li>Anchorage Daily News, July 5, 2026 — tagging details, researcher names</li>
				<li>Cellular Tracking Technologies — {tracking.transmitter} transmitter methodology</li>
			</ul>
			<p class="checked">Data checked {meta.checkedDate}</p>
		</div>
	</section>
</main>

<style>
	.story-header {
		padding: 2rem var(--gutter, 16px) 1rem;
		text-align: center;
	}

	.header-inner {
		max-width: 640px;
		margin: 0 auto;
	}

	h1 {
		font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
		font-weight: 800;
		font-size: clamp(1.75rem, 5vw, 2.5rem);
		line-height: 1.15;
		margin: 0.5rem 0;
		color: var(--text, #16151a);
	}

	.dek {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 1.0625rem;
		line-height: 1.55;
		color: var(--text-muted, #444);
		max-width: 520px;
		margin: 0.75rem auto 0;
	}

	.byline {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 0.875rem;
		color: var(--text-light, #777);
		margin-top: 1rem;
	}

	.map-section {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 var(--gutter, 16px) 2rem;
	}

	.context {
		padding: 2rem var(--gutter, 16px) 3rem;
		background: var(--bg, #fffdf8);
	}

	.context-inner {
		max-width: 600px;
		margin: 0 auto;
	}

	.context h2 {
		font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
		font-weight: 800;
		font-size: 1.375rem;
		margin: 0 0 0.75rem;
	}

	.context p {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 1rem;
		line-height: 1.6;
		margin: 0 0 0.75rem;
		color: var(--text, #16151a);
	}

	.sources {
		padding: 2rem var(--gutter, 16px) 4rem;
		border-top: 1px solid var(--border-soft, #ddd7cb);
	}

	.sources-inner {
		max-width: 600px;
		margin: 0 auto;
	}

	.sources h3 {
		font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
		font-weight: 800;
		font-size: 1rem;
		margin: 0 0 0.5rem;
	}

	.sources ul {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 0.875rem;
		line-height: 1.5;
		padding-left: 1.25rem;
		color: var(--text-muted, #444);
	}

	.sources li {
		margin-bottom: 0.25rem;
	}

	.checked {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 0.75rem;
		color: var(--text-light, #777);
		margin-top: 0.75rem;
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
