<script lang="ts">
	import { page } from '$app/stores';
	const code = $derived($page.url.searchParams.get('code'));
</script>

<svelte:head>
	<title>Data Deletion — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-16 text-center">
	<div class="mb-4 text-4xl">✅</div>
	<h1 class="mb-3 text-2xl font-bold text-[var(--color-text)]">Data deletion confirmed</h1>
	<p class="mb-6 text-sm text-[var(--color-muted)]">
		Your RFP Squad account and all associated data (picks, group memberships, profile) have been
		permanently deleted.
	</p>
	{#if code}
		<p class="text-xs text-[var(--color-muted)]">
			Confirmation code: <span class="font-mono text-[var(--color-text)]">{code}</span>
		</p>
	{/if}
</div>
