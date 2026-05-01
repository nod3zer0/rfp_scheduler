<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state('');
	$effect(() => { name = data.suggestedName; });
</script>

<svelte:head>
	<title>Complete Registration — RFP Squad</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<p class="text-3xl">👋</p>
			<h1 class="mt-2 text-2xl font-bold text-[var(--color-text)]">Almost there!</h1>
			<p class="mt-1 text-sm text-[var(--color-muted)]">
				Choose your display name for RFP Squad.
			</p>
		</div>

		{#if form?.error}
			<div class="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
				{form.error}
			</div>
		{/if}

		<form method="POST" action="?redirect={encodeURIComponent(data.redirectTo)}" class="flex flex-col gap-4">
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-[var(--color-text)]">Display name</span>
				<input
					type="text"
					name="name"
					bind:value={name}
					required
					autocomplete="nickname"
					placeholder="What should friends see?"
					class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
				/>
				<p class="mt-1 text-xs text-[var(--color-muted)]">Pre-filled from your Facebook name — change it if you like.</p>
			</label>

			<button
				type="submit"
				class="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white hover:bg-[var(--color-accent-hover)]"
			>
				Finish setup
			</button>
		</form>
	</div>
</div>
