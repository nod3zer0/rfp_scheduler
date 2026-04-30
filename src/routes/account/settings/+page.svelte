<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nameInput = $state('');
	let savingName = $state(false);
	let savingPw = $state(false);

	$effect(() => { nameInput = data.userName; });
</script>

<svelte:head>
	<title>Account Settings — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-12">
	<div class="mb-8">
		<a href="/" class="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">← Back</a>
		<h1 class="text-2xl font-bold text-[var(--color-text)]">Account Settings</h1>
		<p class="mt-1 text-sm text-[var(--color-muted)]">Manage your registered identity</p>
	</div>

	<!-- Change name -->
	<section class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Display Name</h2>

		{#if (form as { nameSuccess?: boolean } | null)?.nameSuccess}
			<div class="mb-3 rounded-lg border border-green-800 bg-green-950/40 px-4 py-2.5 text-sm text-green-300">
				Name updated successfully.
			</div>
		{/if}
		{#if (form as { nameError?: string } | null)?.nameError}
			<div class="mb-3 rounded-lg border border-red-800 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
				{(form as { nameError: string }).nameError}
			</div>
		{/if}

		<form
			method="POST"
			action="?/changeName"
			class="flex gap-2"
			use:enhance={() => {
				savingName = true;
				return async ({ update }) => { await update(); savingName = false; };
			}}
		>
			<input
				type="text"
				name="name"
				bind:value={nameInput}
				required
				class="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
			<button
				type="submit"
				disabled={savingName || !nameInput.trim()}
				class="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-[var(--color-accent-hover)]"
			>
				{savingName ? 'Saving…' : 'Save'}
			</button>
		</form>
		<p class="mt-2 text-xs text-[var(--color-muted)]">This updates your name in all groups.</p>
	</section>

	<!-- Change password -->
	<section class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
		<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Change Password</h2>

		{#if (form as { pwSuccess?: boolean } | null)?.pwSuccess}
			<div class="mb-3 rounded-lg border border-green-800 bg-green-950/40 px-4 py-2.5 text-sm text-green-300">
				Password updated successfully.
			</div>
		{/if}
		{#if (form as { pwError?: string } | null)?.pwError}
			<div class="mb-3 rounded-lg border border-red-800 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
				{(form as { pwError: string }).pwError}
			</div>
		{/if}

		<form
			method="POST"
			action="?/changePassword"
			class="flex flex-col gap-3"
			use:enhance={() => {
				savingPw = true;
				return async ({ update }) => { await update(); savingPw = false; };
			}}
		>
			<input
				type="password"
				name="current"
				placeholder="Current password"
				required
				autocomplete="current-password"
				class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
			<input
				type="password"
				name="password"
				placeholder="New password (min. 6 chars)"
				required
				autocomplete="new-password"
				class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
			<input
				type="password"
				name="confirm"
				placeholder="Confirm new password"
				required
				autocomplete="new-password"
				class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
			<button
				type="submit"
				disabled={savingPw}
				class="rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-[var(--color-accent-hover)]"
			>
				{savingPw ? 'Updating…' : 'Update password'}
			</button>
		</form>
	</section>

	<!-- My groups shortcut -->
	<section class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
		<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">My Groups</h2>
		<a href="/account/groups" class="text-sm text-[var(--color-accent)] hover:underline">
			View and switch groups →
		</a>
	</section>

	<!-- Sign out -->
	<div class="mt-8 text-center">
		<form method="POST" action="/account/logout">
			<button type="submit" class="text-sm text-[var(--color-muted)] hover:text-red-400">
				Sign out
			</button>
		</form>
	</div>
</div>
