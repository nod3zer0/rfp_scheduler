<script lang="ts">
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Admin Login — RFP Squad</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<h1 class="mb-6 text-center text-2xl font-bold text-[var(--color-text)]">Admin</h1>

		{#if form?.error}
			<p class="mb-4 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">{form.error}</p>
		{/if}

		<form method="post" class="flex flex-col gap-4">
			<input
				name="password"
				type="password"
				required
				placeholder="Admin password"
				class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
			<button
				type="submit"
				class="rounded-md bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white hover:bg-[var(--color-accent-hover)]"
			>
				Login
			</button>
		</form>
	</div>
</div>
