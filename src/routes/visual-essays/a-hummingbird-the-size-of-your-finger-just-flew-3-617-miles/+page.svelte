<script>
	import { onMount } from 'svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import HummingbirdMap from '$lib/components/HummingbirdMap.svelte';
	import Scroller from '$lib/components/Scroller.svelte';

	let { data } = $props();

	const { hummingbird, countriesGeo } = data;
	const { birds, oldRecord, species, meta, tracking } = hummingbird;
	const record = birds.find((b) => b.id === 'record');

	let t = $state(0);
	let playing = $state(false);
	let reducedMotion = $state(false);
	let videoEl = $state(null);
	let mapProgress = $state(0);
	let mapIndex = $state(0);

	function reveal(node) {
		if (reducedMotion) return;
		node.style.opacity = '0';
		node.style.transform = 'translateY(24px)';
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					node.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
					node.style.opacity = '1';
					node.style.transform = 'translateY(0)';
					observer.unobserve(node);
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(node);
		return { destroy() { observer.disconnect(); } };
	}

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// Allow ?t=0.5 for deterministic frame capture (client-side only)
		const tParam = new URL(window.location.href).searchParams.get('t');
		if (tParam !== null) {
			t = Math.max(0, Math.min(1, parseFloat(tParam)));
		}

		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		mq.addEventListener('change', (e) => { reducedMotion = e.matches; });

		if (videoEl) {
			const observer = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						videoEl.play();
					} else {
						videoEl.pause();
					}
				},
				{ threshold: 0.25 }
			);
			observer.observe(videoEl);
			return () => observer.disconnect();
		}
	});

	$effect(() => {
		if (!reducedMotion) t = mapProgress;
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
			<svg class="title-underline" viewBox="0 0 400 6" preserveAspectRatio="none" aria-hidden="true">
				<path d="M0,3 C20,0 40,6 60,3 C80,0 100,6 120,3 C140,0 160,6 180,3 C200,0 220,6 240,3 C260,0 280,6 300,3 C320,0 340,6 360,3 C380,0 400,6 400,3" fill="none" stroke="var(--ink, #22211f)" stroke-width="2" stroke-linecap="round" />
			</svg>
			<p class="byline">By Zach Alexander</p>
		</div>
	</header>

	<section class="hero-drawing">
		<img
			class="hero-img"
			src="/art/hummingbird/hero.png"
			alt="Two rufous hummingbirds hovering at a red backyard feeder, with a wooden fence and Colorado mountains in the background"
		/>
	</section>

	<section class="context" use:reveal>
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

	<section class="drawing" use:reveal>
		<div class="hand-scale">
			<span class="tape tape-tl"></span>
			<span class="tape tape-tr"></span>
			<span class="tape tape-bl"></span>
			<span class="tape tape-br"></span>
			<img
				src="/art/hummingbird/hand-scale.png"
				alt="A rufous hummingbird drawn life-size beside an open hand — about the length of a middle finger"
			/>
			<video bind:this={videoEl} loop muted playsinline aria-label="A rufous hummingbird hovering at a backyard feeder">
				<source src="/art/hummingbird/rufous-feeder.webm" type="video/webm" />
			</video>
			<span class="hand-label"><span class="label-full">Average length of Rufous Hummingbird<br />(2.8–3.5 inches)</span><span class="label-short">Avg. length: 2.8–3.5 in.</span></span>
		</div>
		<p class="fig-label">Fig. 1 — Rufous hummingbird, life-size</p>
	</section>

	<section class="context" use:reveal>
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
		<Scroller bind:index={mapIndex} bind:progress={mapProgress}>
			{#snippet background()}
				<HummingbirdMap
					{countriesGeo}
					{birds}
					{oldRecord}
					{species}
					{meta}
					mode="scroll"
					bind:t
					bind:playing
					{reducedMotion}
				/>
			{/snippet}
			{#snippet foreground()}
				<div class="cards-spacer"></div>
				<div class="step scroll-card">
					<p>June 24, 2026. Portage, Alaska. A team glues a 0.06-gram tag to a rufous hummingbird and lets it go.</p>
				</div>
				<div class="step scroll-card">
					<p>The signal shows up in British Columbia — Atlin, Valemount. Hikers' phones pick it up via Bluetooth.</p>
				</div>
				<div class="step scroll-card">
					<p>Through the Rockies. Kemmerer, Wyoming. Durango, Colorado.</p>
				</div>
				<div class="step scroll-card">
					<p>Springerville, Arizona. Four states crossed. Heading for the border.</p>
				</div>
				<div class="step scroll-card">
					<p>Guadalajara. Zamora. At least 3,617 miles from where it started.</p>
				</div>
				<div class="step scroll-card scroll-card-empty"></div>
				<div class="cards-spacer"></div>
			{/snippet}
		</Scroller>
		<p class="fig-label">Fig. 2 — Migration route, Alaska to Mexico</p>
	</section>

	<section class="hook-number" use:reveal>
		<span class="hook-digits">{record.distanceMi.toLocaleString()}</span>
		<span class="hook-label">miles</span>
		<p class="hook-sub">From a backyard in Alaska to central Mexico — roughly {(record.bodyLengths.min / 1e6).toFixed(0)} to {(record.bodyLengths.max / 1e6).toFixed(0)}&nbsp;million times its own body length.</p>
	</section>

	<section class="context" use:reveal>
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

	<section class="context" use:reveal>
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

	<section class="sources" use:reveal>
		<div class="sources-inner">
			<span class="tape tape-src-tl"></span>
			<span class="tape tape-src-tr"></span>
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
	}

	/* 2. Header */
	.story-header {
		padding: 2rem var(--gutter, 16px) 1.5rem;
		text-align: left;
	}

	.header-inner {
		max-width: 660px;
		margin: 0 auto;
	}

	h1 {
		font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
		font-weight: 800;
		font-size: clamp(1.75rem, 5vw, 3rem);
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
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--text-muted, #444);
		margin-top: 1.25rem;
		border: 1px solid rgba(0, 0, 0, 0.15);
		display: inline-block;
		padding: 0.25em 0.6em;
		transform: rotate(-1deg);
	}

	/* Hero image — wide, clean */
	.hero-drawing {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--gutter, 16px) 1.5rem;
	}

	.hero-img {
		display: block;
		width: 100%;
		height: auto;
		mask-image:
			linear-gradient(to bottom, transparent 0%, black 2%, black 98%, transparent 100%),
			linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%);
		mask-composite: intersect;
		-webkit-mask-image:
			linear-gradient(to bottom, transparent 0%, black 2%, black 98%, transparent 100%),
			linear-gradient(to right, transparent 0%, black 2%, black 98%, transparent 100%);
		-webkit-mask-composite: source-in;
	}

	/* Title underline */
	.title-underline {
		display: block;
		width: 80%;
		height: 6px;
		margin: 0.25rem 0 0;
		opacity: 0.25;
	}

	/* Figure labels */
	.fig-label {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-style: italic;
		font-size: 0.8125rem;
		color: var(--text-muted, #444);
		text-align: center;
		margin: 0.5rem 0 0;
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
		max-width: 1000px;
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
		transform: none;
		background: #fffdf8;
		padding: 1.25rem 1rem 0.75rem;
		border-radius: 2px;
		border: 1px solid rgba(0, 0, 0, 0.08);
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
		top: 6.5%;
		left: 50%;
		transform: translateX(-50%);
		font-family: var(--font-body, 'Karla', sans-serif);
		font-weight: 700;
		font-size: clamp(0.625rem, 2.5vw, 1rem);
		color: #e0301e;
		white-space: pre-line;
		line-height: 1.3;
		text-align: center;
	}

	.label-short { display: none; }

	@media (max-width: 400px) {
		.hand-scale {
			padding: 0.75rem 0.5rem 0.5rem;
		}

		.hand-scale img {
			width: 42%;
		}

		.hand-scale video {
			width: 40%;
		}

		.hand-label {
			top: 5.5%;
			font-size: 0.5rem;
		}

		.label-full { display: none; }
		.label-short { display: inline; }
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

	/* 6. Scroll-driven map */
	.map-section {
		position: relative;
		max-width: 100%;
		margin: 0 auto;
		padding: 0;
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
		max-width: 660px;
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
		font-size: 1.1875rem;
		line-height: 1.65;
		margin: 0 0 1em;
		color: var(--text, #16151a);
	}

	.sources {
		max-width: 660px;
		margin: 0 auto;
		padding: 2rem var(--gutter, 16px) 4rem;
		border-top: none;
	}

	.sources-inner {
		position: relative;
		max-width: 600px;
		margin: 0 auto;
		background: #fffdf8;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 2px;
		padding: 1.25rem 1.5rem;
		transform: rotate(0.5deg);
	}

	.tape-src-tl { top: -7px; left: 12px; transform: rotate(-12deg); }
	.tape-src-tr { top: -7px; right: 12px; transform: rotate(10deg); }

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

	/* Hook number — cobalt accent moment */
	.hook-number {
		text-align: center;
		padding: 3rem var(--gutter, 16px) 2rem;
	}

	.hook-digits {
		display: block;
		font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
		font-weight: 800;
		font-size: clamp(4rem, 15vw, 10rem);
		line-height: 1;
		color: var(--accent, #3b4fd9);
	}

	.hook-label {
		display: block;
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: clamp(1rem, 3vw, 1.5rem);
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: var(--accent, #3b4fd9);
		opacity: 0.7;
		margin-top: 0.25rem;
	}

	.hook-sub {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 1.0625rem;
		line-height: 1.55;
		color: var(--text-muted, #444);
		max-width: 480px;
		margin: 1rem auto 0;
	}

	/* Scroll cards for map narration */
	.cards-spacer {
		height: 70vh;
	}

	.scroll-card {
		max-width: 320px;
		margin: 0 0 70vh;
		padding: 1rem 1.25rem;
		background: rgba(255, 253, 248, 0.88);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 3px;
		pointer-events: auto;
		backdrop-filter: blur(4px);
	}

	.scroll-card p {
		font-family: var(--font-body, 'Karla', sans-serif);
		font-size: 1rem;
		line-height: 1.55;
		color: var(--text, #16151a);
		margin: 0;
	}

	.scroll-card-empty {
		background: none;
		border: none;
		backdrop-filter: none;
		min-height: 1px;
	}

	@media (min-width: 600px) {
		.scroll-card {
			margin-left: clamp(24px, 5vw, 80px);
		}
	}

	@media (max-width: 480px) {
		.story-header { padding: 1.25rem var(--gutter, 16px) 0.75rem; }

		.hero-drawing { padding-bottom: 1rem; }

		.context { padding: 1rem var(--gutter, 16px) 1.5rem; }
		.context:nth-of-type(2) { padding-top: 0.75rem; padding-bottom: 1.5rem; }
		.context:nth-of-type(3) { padding-top: 1.25rem; padding-bottom: 1rem; }
		.context:last-of-type  { padding-top: 0.5rem; padding-bottom: 1.5rem; }

		.context p { font-size: 1.0625rem; line-height: 1.55; }

		.drawing { padding: 0.5rem var(--gutter, 16px) 0.5rem; }
		.sources { padding: 1.25rem var(--gutter, 16px) 2.5rem; }
		.sources-inner { padding: 1rem 1.125rem; }

		.scroll-card {
			max-width: none;
			margin-left: var(--gutter, 16px);
			margin-right: var(--gutter, 16px);
		}

		.hook-number { padding: 2rem var(--gutter, 16px) 1.5rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
