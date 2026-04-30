<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Create Group — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-12">
	<h1 class="mb-2 text-2xl font-bold text-[var(--color-text)]">Create a group</h1>
	<p class="mb-8 text-sm text-[var(--color-muted)]">
		Create a group, then share the invite link with your friends.
	</p>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
			{form.error}
		</div>
	{/if}

	<form
		method="post"
		class="flex flex-col gap-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<label class="block">
			<span class="mb-1 block text-sm font-medium text-[var(--color-muted)]">Group name</span>
			<input
				name="name"
				type="text"
				required
				placeholder="e.g. The Rock Crew"
				class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
		</label>

		<label class="block">
			<span class="mb-1 block text-sm font-medium text-[var(--color-muted)]">Admin password</span>
			<input
				name="password"
				type="password"
				required
				placeholder="For managing the group later"
				class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
		</label>

		<label class="block">
			<span class="mb-1 block text-sm font-medium text-[var(--color-muted)]">Confirm password</span>
			<input
				name="confirm"
				type="password"
				required
				class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
		</label>

		<button
			type="submit"
			disabled={submitting}
			class="mt-2 rounded-md bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
		>
			{submitting ? 'Creating…' : 'Create group'}
		</button>
	</form>
</div>
