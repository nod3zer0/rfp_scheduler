<script lang="ts">
	import { enhance } from '$app/forms';
	import MemberChip from '$lib/components/MemberChip.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nameInput = $state('');
	let submitting = $state(false);

	function pickName(name: string, isRegistered: boolean) {
		if (isRegistered) return;
		nameInput = name;
	}
</script>

<svelte:head>
	<title>Join {data.group.name} — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-12">
	<div class="mb-6 text-center">
		<div class="mb-2 text-3xl">🎸</div>
		<h1 class="text-2xl font-bold text-[var(--color-text)]">Join {data.group.name}</h1>
		<p class="mt-1 text-sm text-[var(--color-muted)]">Pick your name to track picks together.</p>
	</div>

	{#if !data.group.allowGuests}
		<div class="mb-5 rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-200">
			🔒 This group requires a registered account.
			<a href="/account/login" class="ml-1 underline">Sign in</a> or
			<a href="/account/register" class="underline">create an account</a> to join.
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
			{form.error}
			{#if (form as { error: string }).error?.includes('registered')}
				<a href="/account/login" class="ml-1 underline">Sign in →</a>
			{/if}
		</div>
	{/if}

	{#if data.existingMembers.length > 0}
		<div class="mb-5">
			<p class="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
				Already in this group — click your name:
			</p>
			<div class="flex flex-wrap gap-2">
				{#each data.existingMembers as m (m.id)}
					<button
						type="button"
						disabled={m.isRegistered}
						title={m.isRegistered ? `${m.name} is password-protected — sign in to join as them` : m.name}
						class="rounded-lg border px-3 py-1.5 text-sm transition-colors {nameInput.toLowerCase() === m.name.toLowerCase()
							? 'border-[var(--color-accent)] bg-[var(--color-surface-2)]'
							: m.isRegistered
								? 'cursor-not-allowed border-[var(--color-border)] opacity-40'
								: 'border-[var(--color-border)] hover:border-[var(--color-muted)]'}"
						onclick={() => pickName(m.name, m.isRegistered)}
					>
						<span class="flex items-center gap-1">
							<MemberChip name={m.name} size="sm" showName />
							{#if m.isRegistered}<span class="text-[10px]">🔒</span>{/if}
						</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<form
		method="post"
		class="flex flex-col gap-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		<label class="block">
			<span class="mb-1 block text-sm font-medium text-[var(--color-muted)]">Your name</span>
			<input
				name="name"
				type="text"
				required
				bind:value={nameInput}
				placeholder="What should we call you?"
				class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
				autocomplete="nickname"
			/>
		</label>

		<button
			type="submit"
			disabled={submitting || !nameInput.trim()}
			class="rounded-md bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
		>
			{submitting ? 'Joining…' : `Join ${data.group.name}`}
		</button>
	</form>

	<p class="mt-6 text-center text-sm text-[var(--color-muted)]">
		Have an account?
		<a href="/account/login" class="text-[var(--color-accent)] hover:underline">Sign in</a>
		to auto-join instantly.
	</p>
</div>
