<script>
	let email = $state('');
	let submitted = $state(false);

	function handleSubmit(e) {
		e.preventDefault();
		// TODO: connect to newsletter provider (Buttondown, Mailchimp, etc.)
		// For now, just show a confirmation
		submitted = true;
	}
</script>

<div class="newsletter">
	<p class="newsletter-heading">Get new essays by email</p>
	<p class="newsletter-description">One email per story. No spam, no filler.</p>
	{#if !submitted}
		<form class="newsletter-form" onsubmit={handleSubmit}>
			<input
				type="email"
				bind:value={email}
				placeholder="your@email.com"
				required
				class="newsletter-input"
			/>
			<button type="submit" class="newsletter-button">Subscribe</button>
		</form>
	{:else}
		<p class="newsletter-thanks">Thanks! You'll hear from us soon.</p>
	{/if}
</div>

<style>
	.newsletter {
		text-align: center;
		max-width: 420px;
		margin: 0 auto;
	}

	.newsletter-heading {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.25rem;
		margin-bottom: 4px;
	}

	.newsletter-description {
		font-size: 0.9375rem;
		color: var(--text-muted);
		margin-bottom: 16px;
	}

	.newsletter-form {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.newsletter-input {
		width: 100%;
		max-width: 240px;
		padding: 10px 14px;
		font-family: var(--font-body);
		font-size: 0.9375rem;
		border: 2px solid var(--ink, #22211f);
		border-radius: 6px;
		background: #fff;
		color: var(--ink, #22211f);
		outline: none;
	}

	.newsletter-input:focus {
		border-color: var(--accent, #3b4fd9);
	}

	.newsletter-button {
		padding: 10px 20px;
		font-family: var(--font-body);
		font-size: 0.9375rem;
		font-weight: 600;
		border: 2px solid var(--ink, #22211f);
		border-radius: 6px;
		background: var(--ink, #22211f);
		color: #fff;
		cursor: pointer;
	}

	.newsletter-button:hover {
		opacity: 0.85;
	}

	.newsletter-thanks {
		font-weight: 600;
		font-size: 0.9375rem;
	}

	@media (max-width: 480px) {
		.newsletter-form {
			flex-direction: column;
			align-items: center;
		}

		.newsletter-input {
			max-width: none;
			width: 100%;
		}

		.newsletter-button {
			width: 100%;
		}
	}
</style>
