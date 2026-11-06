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
	description="A burnt-red hummingbird fuels up at a backyard feeder in Colorado — one pit stop on a 3,617-mile journey from Alaska to Mexico. For its size, it is one of the longest migrations of any bird in the world."
	url="https://thewildplot.com/visual-essays/a-hummingbird-the-size-of-your-finger-just-flew-3-617-miles"
/>

<main class="story" style="--story-color: #23304a; --story-ink: #f6f0e2; --bg: #fffdf8;">
	<header class="story-header">
		<div class="header-inner">
			<p class="eyebrow">Migration &middot; Birds</p>
			<h1>A hummingbird the size of your finger just flew 3,617 miles</h1>
			<p class="dek">
				A burnt-red hummingbird hovers at a feeder in a quiet backyard in Colorado.
				It is a hot July afternoon and the bird is fueling up on the free sugar water.
			</p>
			<p class="byline">By Zach Alexander</p>
		</div>
	</header>

	<section class="context">
		<div class="context-inner">
			<p>
				Rufous hummingbirds turn up in backyards across the western United States in late
				summer. What many people don't realize is that their backyard is one pit stop on a
				much longer journey south.
			</p>
			<p>
				These buzzing migrants are roughly 3&nbsp;inches long. That is about the length of
				your middle finger. For their size, they make one of the longest migrations of any
				bird in the world.
			</p>
		</div>
	</section>

	<section class="drawing">
		<div class="hand-scale">
			<span class="tape tape-tl"></span>
			<span class="tape tape-tr"></span>
			<span class="tape tape-bl"></span>
			<span class="tape tape-br"></span>
			<img
				src="/art/hummingbird/hand-scale.png"
				alt="A rufous hummingbird drawn life-size beside an open hand — about the length of a middle finger"
			/>
			<video autoplay loop muted playsinline aria-label="A rufous hummingbird hovering at a backyard feeder">
				<source src="/art/hummingbird/rufous-feeder.webm" type="video/webm" />
			</video>
			<span class="hand-label">Average length of Rufous Hummingbird</span>
		</div>
	</section>

	<section class="context">
		<div class="context-inner">
			<p>
				These tiny birds breed farther north than any other hummingbird in the world.
				They arrive in Southeast and Southcentral Alaska by May for breeding and begin
				heading south again in July.
			</p>
			<p>
				A few months ago, scientists in Alaska fitted three rufous hummingbirds with tiny
				Bluetooth tags and listened for where they turned up. Long migrations had been
				recorded for this species before, but no one had been able to follow a single bird
				through its stopovers, which have a big impact on whether a bird makes it at all.
				This time they could. The tags pinged at points along the way, showing that one
				hummingbird traveled at least {record.distanceMi.toLocaleString()}&nbsp;miles from
				Alaska to Guadalajara, Mexico, breaking a record set in {oldRecord.year}.
			</p>
		</div>
	</section>

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
			<p>
				You may be thinking, so what. Three thousand-odd miles seems a long way, but I have
				crossed that distance in a plane, asleep, in one afternoon.
			</p>
			<p>
				Well, for starters, these little flyers have no engine to fuel the journey, just two
				tiny wings, around 4.3&nbsp;inches from tip to tip. At about 3&nbsp;inches long, a
				{record.distanceMi.toLocaleString()}-mile journey comes to roughly
				{(record.bodyLengths.min / 1e6).toFixed(0)} to {(record.bodyLengths.max / 1e6).toFixed(0)}&nbsp;million
				times its own length. Scale that up to a person of my height and the same journey
				would be about three times around the Earth.
			</p>
		</div>
	</section>

	<!-- Drawing: scale comparison, half — A single Earth circle in sky and sage, a flat ink line wound round it two and a half times like thread on a spool, and one tiny walking figure in brick at the start of the line. -->

	<section class="context">
		<div class="context-inner">
			<p>
				The other two hummingbirds in the study flew 3,450&nbsp;miles and 3,528&nbsp;miles.
				Both also ended up in central Mexico.
			</p>
		</div>
	</section>

	<svg class="wavy-rule" viewBox="0 0 600 8" preserveAspectRatio="none" aria-hidden="true">
		<path d="M0,4 C25,0 50,8 75,4 C100,0 125,8 150,4 C175,0 200,8 225,4 C250,0 275,8 300,4 C325,0 350,8 375,4 C400,0 425,8 450,4 C475,0 500,8 525,4 C550,0 575,8 600,4" fill="none" stroke="var(--ink, #22211f)" stroke-width="2" stroke-linecap="round" />
	</svg>

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
	/* 1. Dot-grid paper background */
	.story {
		background-color: var(--bg, #fffdf8);
		background-image: radial-gradient(circle, #d5cfc3 0.8px, transparent 0.8px);
		background-size: 24px 24px;
	}

	/* 2. Left-aligned header */
	.story-header {
		padding: 2rem var(--gutter, 16px) 1rem;
		text-align: left;
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
		margin: 0.75rem 0 0;
	}

	.byline {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 0.875rem;
		color: var(--text-light, #777);
		margin-top: 1rem;
	}

	/* 3. Drop cap on first paragraph */
	.context:first-of-type .context-inner p:first-child::first-letter {
		font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
		font-weight: 800;
		font-size: 3.2em;
		float: left;
		line-height: 0.8;
		margin-right: 0.08em;
		margin-top: 0.05em;
	}

	/* 4. Taped-in drawing */
	.drawing {
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem var(--gutter, 16px) 1rem;
	}

	.drawing img,
	.drawing video {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 4px;
	}

	.hand-scale {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		transform: rotate(-1.2deg);
		background: #fffdf8;
		padding: 1.25rem 1rem 0.75rem;
		border-radius: 2px;
	}

	.hand-scale img {
		width: 50%;
	}

	.hand-scale video {
		width: 48%;
		flex-shrink: 0;
		margin-left: -6%;
	}

	.tape {
		position: absolute;
		width: clamp(28px, 6vw, 48px);
		height: clamp(10px, 2vw, 16px);
		background: rgba(213, 207, 195, 0.55);
		border: 1px solid rgba(0, 0, 0, 0.08);
		z-index: 2;
		pointer-events: none;
	}

	.tape-tl { top: -7px; left: 8px; transform: rotate(-18deg); }
	.tape-tr { top: -7px; right: 8px; transform: rotate(14deg); }
	.tape-bl { bottom: -7px; left: 10px; transform: rotate(10deg); }
	.tape-br { bottom: -7px; right: 6px; transform: rotate(-12deg); }

	.hand-label {
		position: absolute;
		top: 6%;
		left: 3%;
		font-family: var(--font-body, 'Karla', sans-serif);
		font-weight: 700;
		font-size: clamp(0.625rem, 2vw, 0.8125rem);
		color: #e0301e;
		max-width: 8em;
		line-height: 1.3;
	}

	@media (max-width: 400px) {
		.hand-scale {
			flex-direction: column;
			padding: 1rem 0.75rem 0.5rem;
		}

		.hand-scale img {
			width: 80%;
		}

		.hand-scale video {
			width: 70%;
			margin-left: 0;
			margin-top: -8%;
		}
	}

	/* 5. Wavy divider */
	.wavy-rule {
		display: block;
		max-width: 600px;
		width: 100%;
		height: 8px;
		margin: 0 auto;
		opacity: 0.3;
	}

	/* 6. Sketch frame around map */
	.map-section {
		position: relative;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 var(--gutter, 16px) 2rem;
	}

	.map-section::before {
		content: '';
		position: absolute;
		inset: 8px;
		border: 2px solid var(--ink, #22211f);
		border-radius: 2px;
		transform: rotate(0.3deg);
		opacity: 0.2;
		pointer-events: none;
		z-index: 1;
	}

	/* 1 (cont.) Transparent context background so dot grid shows through */
	.context {
		padding: 2rem var(--gutter, 16px) 3rem;
		background: transparent;
	}

	/* 7. Organic vertical spacing */
	.context:nth-of-type(2) { padding-top: 1.5rem; padding-bottom: 3.5rem; }
	.context:nth-of-type(3) { padding-top: 2.5rem; padding-bottom: 2rem; }
	.context:last-of-type  { padding-top: 1rem; padding-bottom: 3rem; }

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
		border-top: none;
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

	@media (max-width: 480px) {
		.map-section::before { display: none; }
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
