<nav class="nav" aria-label="Main">
	<div class="nav-inner">
		<a href="/" class="wordmark">the wild plot</a>
	</div>
</nav>

<style>
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--nav-height);
		background: var(--bg-nav);
		z-index: 100;
	}

	.nav-inner {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 0 var(--gutter);
		height: 100%;
		display: flex;
		align-items: center;
	}

	.wordmark {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--text);
	}

	@media (max-width: 480px) {
		.wordmark {
			font-size: 1.25rem;
		}
	}
</style>
