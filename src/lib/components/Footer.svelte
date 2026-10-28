<script>
	import NewsletterSignup from '$lib/components/NewsletterSignup.svelte';
</script>

<footer class="footer">
	<div class="footer-newsletter">
		<NewsletterSignup />
	</div>
	<div class="footer-inner">
		<span class="wordmark">the wild plot</span>
		<span class="muted">Visual essays by Zach Alexander</span>
	</div>
</footer>

<style>
	.footer {
		margin-top: 120px;
		padding: 0 var(--gutter);
	}

	.footer-newsletter {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 0 var(--gutter) 40px;
	}

	@media (max-width: 480px) {
		.footer-newsletter {
			border-top: var(--rule);
			padding-top: 32px;
		}
	}

	.footer-inner {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: 24px 0 40px;
		border-top: var(--rule);
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px 24px;
		font-size: 0.9375rem;
	}

	.wordmark {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.125rem;
		letter-spacing: -0.03em;
		color: var(--text);
	}

	.muted {
		color: var(--text-muted);
	}
</style>
