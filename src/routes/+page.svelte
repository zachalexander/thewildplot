<script>
	import OgMeta from '$lib/components/OgMeta.svelte';
	import StoryGrid from '$lib/components/StoryGrid.svelte';
	import { stories } from '$lib/stories/index.js';
</script>

<OgMeta title="The Wild Plot" description="Visual essays by Zach Alexander." />

<main class="home">
	<div class="container">
		<header class="site-intro">
			<h1 class="wordmark"><img src="/wildplot.png" alt="the wild plot" class="hero-logo" /></h1>
			<p>
				Hand-drawn data visuals and essays about the wonder of the natural world, and about us being present for it.
			</p>
		</header>

		<StoryGrid {stories} featureFirst showUpcoming />
	</div>
</main>

<style>
	.home {
		padding: 24px var(--gutter) 0;
	}

	.container {
		max-width: var(--max-width);
		margin: 0 auto;
	}

	.site-intro {
		text-align: center;
		padding-bottom: 28px;
		margin-bottom: 32px;
		border-bottom: var(--rule);
	}

	.wordmark {
		line-height: 0;
	}

	.hero-logo {
		display: inline-block;
		width: 100%;
		max-width: 680px;
		height: auto;
	}

	.newsletter-section {
		margin-bottom: 40px;
		padding-bottom: 28px;
		border-bottom: var(--rule);
	}

	.site-intro p {
		max-width: 520px;
		margin: 0 auto;
		font-size: 1.125rem;
		line-height: 1.5;
	}
</style>
