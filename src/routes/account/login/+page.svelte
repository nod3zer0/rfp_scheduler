<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state('');
	let password = $state('');

	$effect(() => {
		name = (form as { name?: string } | null)?.name ?? '';
	});
</script>

<svelte:head>
	<title>Sign in — RFP Squad</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<p class="text-3xl">🎸</p>
			<h1 class="mt-2 text-2xl font-bold text-[var(--color-text)]">Sign in</h1>
			<p class="mt-1 text-sm text-[var(--color-muted)]">Access your protected identity</p>
		</div>

		{#if data.facebookEnabled}
			<a
				href="/account/login/facebook"
				class="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--color-border)] bg-[#1877F2] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
			>
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
				Continue with Facebook
			</a>
			<div class="relative mb-6 flex items-center">
				<div class="flex-1 border-t border-[var(--color-border)]"></div>
				<span class="mx-3 text-xs text-[var(--color-muted)]">or sign in with name</span>
				<div class="flex-1 border-t border-[var(--color-border)]"></div>
			</div>
		{/if}

		{#if form?.error}
			<div class="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
				{form.error}
			</div>
		{/if}

		<form method="POST" class="flex flex-col gap-4">
			<input type="hidden" name="redirect" value={data.redirectTo} />

			<label class="block">
				<span class="mb-1 block text-sm font-medium text-[var(--color-text)]">Name</span>
				<input
					type="text"
					name="name"
					bind:value={name}
					required
					autocomplete="username"
					placeholder="Your registered name"
					class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
				/>
			</label>

			<label class="block">
				<span class="mb-1 block text-sm font-medium text-[var(--color-text)]">Password</span>
				<input
					type="password"
					name="password"
					bind:value={password}
					required
					autocomplete="current-password"
					placeholder="Your password"
					class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
				/>
			</label>

			<button
				type="submit"
				class="mt-1 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white hover:bg-[var(--color-accent-hover)]"
			>
				Sign in
			</button>
		</form>

		<p class="mt-6 text-center text-sm text-[var(--color-muted)]">
			No account yet?
			<a href="/account/register" class="text-[var(--color-accent)] hover:underline">Register</a>
		</p>
	</div>
</div>
