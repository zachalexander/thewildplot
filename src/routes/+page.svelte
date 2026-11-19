<script>
	import OgMeta from '$lib/components/OgMeta.svelte';
	import StoryGrid from '$lib/components/StoryGrid.svelte';
	import { stories } from '$lib/stories/index.js';
</script>

<OgMeta title="The Wild Plot" description="Visual essays by Zach Alexander." />

<main class="home">
	<section class="hero">
		<div class="hero-overlay">
			<h1 class="wordmark"><img src="/wildplot.png" alt="the wild plot" class="hero-logo" /></h1>
			<p class="tagline">Visual essays on the hidden patterns in everyday life.</p>
		</div>
	</section>

	<div class="container">
		<span class="section-eyebrow">Visual Essays</span>
		<StoryGrid {stories} featureFirst showUpcoming showFilters={false} />
	</div>
</main>

<style>
	.hero {
		position: relative;
		height: 500vw;
		background-image: url('/art/homepage-hero.png');
		background-size: 100% auto;
		background-repeat: no-repeat;
		background-position: center top;
		background-color: var(--paper, #f6f0e2);
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}


	.hero-overlay {
		position: relative;
		z-index: 1;
		text-align: center;
		padding: 48px var(--gutter, 24px) 0;
	}

	.wordmark {
		line-height: 0;
	}

	.hero-logo {
		display: inline-block;
		width: 100%;
		max-width: 320px;
		height: auto;
		filter: brightness(0);
		opacity: 0.9;
	}

	.tagline {
		margin-top: 12px;
		font-size: 1.125rem;
		line-height: 1.5;
		color: var(--ink, #22211f);
		max-width: 420px;
		margin-left: auto;
		margin-right: auto;
	}

	.container {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 0 var(--gutter, 24px);
	}

	.section-eyebrow {
		display: block;
		margin-top: 48px;
		margin-bottom: 24px;
		font-size: 0.8125rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted, #888);
	}

	@media (max-width: 640px) {
		.hero {
			background-size: 100% auto;
			background-position: center bottom;
			justify-content: center;
		}

		.hero-logo {
			max-width: 240px;
		}
	}
</style>
