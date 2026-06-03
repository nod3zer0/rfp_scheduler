<script lang="ts">
	import { enhance } from '$app/forms';
	import { getMemberColor } from '$lib/memberColor';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let nameInput = $state('');
	let customColor = $state('');
	let savingName = $state(false);
	let savingPw = $state(false);
	let savingColor = $state(false);

	$effect(() => {
		nameInput = data.userName;
		customColor = data.member?.customColor || '';
	});

	const autoColor = $derived(data.member ? getMemberColor(data.member.id, null) : '#8b5cf6');
	const currentColor = $derived((customColor || '').trim() || autoColor);

	const PRESET_COLORS = [
		// Reds & Oranges
		'#dc2626', '#ef4444', '#f87171', '#fb923c', '#f97316', '#ea580c',
		// Yellows & Limes
		'#f59e0b', '#eab308', '#facc15', '#a3e635', '#84cc16', '#65a30d',
		// Greens
		'#22c55e', '#16a34a', '#10b981', '#059669', '#14b8a6', '#0d9488',
		// Cyans & Blues
		'#06b6d4', '#0891b2', '#0ea5e9', '#0284c7', '#3b82f6', '#2563eb',
		// Indigos & Purples
		'#6366f1', '#4f46e5', '#8b5cf6', '#7c3aed', '#a855f7', '#9333ea',
		// Pinks
		'#d946ef', '#c026d3', '#ec4899', '#db2777', '#f43f5e', '#e11d48'
	];

	// Find which colors are already taken by other members
	const takenColors = $derived(
		new Map(
			data.groupMembers
				.filter((m) => m.customColor && m.id !== data.member?.id)
				.map((m) => [m.customColor!, m.name])
		)
	);
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

	<!-- Profile Color -->
	{#if data.member}
		<section class="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
			<h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">Profile Color</h2>

			{#if (form as { colorSuccess?: boolean } | null)?.colorSuccess}
				<div class="mb-3 rounded-lg border border-green-800 bg-green-950/40 px-4 py-2.5 text-sm text-green-300">
					Color updated successfully.
				</div>
			{/if}
			{#if (form as { colorError?: string } | null)?.colorError}
				<div class="mb-3 rounded-lg border border-red-800 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
					{(form as { colorError: string }).colorError}
				</div>
			{/if}

			<form
				method="POST"
				action="?/updateColor"
				class="flex flex-col gap-4"
				use:enhance={() => {
					savingColor = true;
					return async ({ update }) => { await update(); savingColor = false; };
				}}
			>
				<div class="flex items-center gap-3">
					<div
						class="h-12 w-12 shrink-0 rounded-full border-2 border-[var(--color-border)]"
						style="background-color: {currentColor};"
					></div>
					<div class="flex-1">
						<p class="text-sm text-[var(--color-text)]">
							{customColor ? 'Custom color selected' : 'Using auto-generated color'}
						</p>
						<p class="text-xs text-[var(--color-muted)]">
							Choose a preset color below or reset to auto
						</p>
					</div>
				</div>

				<input type="hidden" name="customColor" value={customColor} />

				<div class="grid grid-cols-6 gap-3 sm:grid-cols-9">
					{#each PRESET_COLORS as color}
						{@const isTaken = takenColors.has(color)}
						{@const takenBy = takenColors.get(color)}
						<button
							type="button"
							class="relative h-12 w-12 rounded-full border-2 transition-all"
							class:border-[var(--color-accent)]={customColor === color}
							class:border-[var(--color-border)]={customColor !== color}
							class:opacity-40={isTaken}
							class:cursor-not-allowed={isTaken}
							class:hover:scale-110={!isTaken}
							style="background-color: {color};"
							onclick={() => !isTaken && (customColor = color)}
							title={isTaken ? `Used by ${takenBy}` : color}
							disabled={isTaken}
						>
							{#if isTaken}
								<div class="absolute inset-0 flex items-center justify-center text-white">
									<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
										<path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
									</svg>
								</div>
							{/if}
						</button>
					{/each}
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						disabled={savingColor}
						class="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-[var(--color-accent-hover)]"
					>
						{savingColor ? 'Saving…' : 'Save Color'}
					</button>
					<button
						type="button"
						onclick={() => customColor = ''}
						disabled={!(customColor || '').trim()}
						class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-2)] disabled:opacity-50"
					>
						Reset
					</button>
				</div>
			</form>
			<p class="mt-2 text-xs text-[var(--color-muted)]">Leave empty for auto-generated color. Used for profile chips and map pins.</p>
		</section>
	{/if}

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
