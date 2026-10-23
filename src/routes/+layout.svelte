<script>
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { page } from '$app/stores';

	let { children } = $props();
	let isStoryPage = $derived($page.url.pathname.startsWith('/visual-essays/'));
</script>

{#if isStoryPage}
	<Nav />
{/if}
{@render children()}
<Footer />
