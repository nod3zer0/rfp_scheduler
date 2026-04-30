<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let origin = $state('');
	$effect(() => {
		origin = window.location.origin;
	});

	function inviteUrl(linkId: string) {
		return `${origin}/join/${linkId}`;
	}

	function copyLink(linkId: string) {
		navigator.clipboard.writeText(inviteUrl(linkId));
	}

	function formatExpiry(expiresAt: string | null) {
		if (!expiresAt) return 'Never';
		return new Date(expiresAt).toLocaleDateString();
	}

	function formatUses(useCount: number, maxUses: number | null) {
		return `${useCount}/${maxUses ?? '∞'}`;
	}

	let deleteConfirm = $state(false);
	let submitting = $state(false);
</script>

<svelte:head>
	<title>Manage {data.group.name} — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-10">
	<div class="mb-6 flex items-center gap-3">
		<a href="/" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">← Home</a>
		<h1 class="text-2xl font-bold text-[var(--color-text)]">{data.group.name}</h1>
		<span class="text-xs text-[var(--color-muted)]">Group management</span>
	</div>

	{#if data.isNew}
		<div class="mb-6 rounded-lg border border-green-800/50 bg-green-950/30 px-5 py-4">
			<p class="font-medium text-green-300">🎉 Your group is ready!</p>
			<p class="mt-1 text-sm text-green-400">Share the invite link below with your friends. Use it yourself too to pick your name.</p>
		</div>
	{/if}

	{#if !data.authenticated}
		<!-- Login form -->
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
			<h2 class="mb-4 text-lg font-semibold">Admin access required</h2>
			{#if form?.loginError}
				<p class="mb-3 text-sm text-red-400">{form.loginError}</p>
			{/if}
			<form method="post" action="?/login" class="flex flex-col gap-3">
				<input
					name="password"
					type="password"
					required
					placeholder="Admin password"
					class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
				/>
				<button
					type="submit"
					class="rounded-md bg-[var(--color-accent)] px-4 py-2 font-medium text-white hover:bg-[var(--color-accent-hover)]"
				>
					Unlock
				</button>
			</form>
		</div>
	{:else}
		<!-- Invite Links -->
		<section class="mb-8">
			<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Invite Links</h2>
			{#if data.links.length === 0}
				<p class="text-sm text-[var(--color-muted)]">No invite links yet.</p>
			{:else}
				<div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
					<table class="w-full text-sm">
						<thead class="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
							<tr>
								<th class="px-4 py-2 text-left">Link</th>
								<th class="px-4 py-2 text-left">Uses</th>
								<th class="px-4 py-2 text-left">Expires</th>
								<th class="px-4 py-2 text-left">Status</th>
								<th class="px-4 py-2"></th>
							</tr>
						</thead>
						<tbody>
							{#each data.links as link (link.id)}
								<tr class="border-t border-[var(--color-border)]">
									<td class="px-4 py-2">
										<div class="flex items-center gap-2">
											<span class="max-w-[200px] truncate font-mono text-xs text-[var(--color-muted)]">/join/{link.id}</span>
											<button
												type="button"
												class="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs hover:border-[var(--color-muted)]"
												onclick={() => copyLink(link.id)}
											>
												Copy
											</button>
										</div>
									</td>
									<td class="px-4 py-2 text-[var(--color-muted)]">{formatUses(link.useCount, link.maxUses)}</td>
									<td class="px-4 py-2 text-[var(--color-muted)]">{formatExpiry(link.expiresAt)}</td>
									<td class="px-4 py-2">
										{#if link.isActive}
											<span class="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-400">Active</span>
										{:else}
											<span class="rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]">Revoked</span>
										{/if}
									</td>
									<td class="px-4 py-2">
										{#if link.isActive}
											<form method="post" action="?/revokeLink">
												<input type="hidden" name="linkId" value={link.id} />
												<button
													type="submit"
													class="text-xs text-red-400 hover:text-red-300"
												>
													Revoke
												</button>
											</form>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<details class="mt-4">
				<summary class="cursor-pointer text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
					+ Create new invite link
				</summary>
				<form method="post" action="?/createLink" class="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
					<label class="block">
						<span class="mb-1 block text-xs text-[var(--color-muted)]">Expires (optional)</span>
						<input
							name="expiresAt"
							type="datetime-local"
							class="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
						/>
					</label>
					<label class="block">
						<span class="mb-1 block text-xs text-[var(--color-muted)]">Max uses (optional)</span>
						<input
							name="maxUses"
							type="number"
							min="1"
							placeholder="∞"
							class="w-24 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
						/>
					</label>
					<button
						type="submit"
						class="rounded-md bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
					>
						Create
					</button>
				</form>
			</details>
		</section>

		<!-- Members -->
		<section class="mb-8">
			<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Members</h2>
			{#if data.members.length === 0}
				<p class="text-sm text-[var(--color-muted)]">No members yet. Share the invite link!</p>
			{:else}
				<div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
					<table class="w-full text-sm">
						<thead class="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
							<tr>
								<th class="px-4 py-2 text-left">Name</th>
								<th class="px-4 py-2 text-left">Joined</th>
								<th class="px-4 py-2 text-left">Picks</th>
								<th class="px-4 py-2"></th>
							</tr>
						</thead>
						<tbody>
							{#each data.members as m (m.id)}
								<tr class="border-t border-[var(--color-border)]">
									<td class="px-4 py-2 font-medium text-[var(--color-text)]">{m.name}</td>
									<td class="px-4 py-2 text-[var(--color-muted)]">{new Date(m.createdAt).toLocaleDateString()}</td>
									<td class="px-4 py-2 text-[var(--color-muted)]">{m.pickCount}</td>
									<td class="px-4 py-2">
										<form method="post" action="?/removeMember">
											<input type="hidden" name="memberId" value={m.id} />
											<button
												type="submit"
												class="text-xs text-red-400 hover:text-red-300"
												onclick={(e) => { if (!confirm(`Remove ${m.name}? Their picks will be deleted.`)) e.preventDefault(); }}
											>
												Remove
											</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Settings -->
		<section class="mb-8">
			<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Settings</h2>
			<div class="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
				<form method="post" action="?/renameGroup" class="flex gap-3">
					<input
						name="name"
						type="text"
						required
						placeholder="New group name"
						value={data.group.name}
						class="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
					/>
					<button
						type="submit"
						class="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-muted)]"
					>
						Rename
					</button>
				</form>

				<form method="post" action="?/changePassword" class="flex flex-wrap gap-3">
					<input
						name="password"
						type="password"
						required
						placeholder="New admin password"
						class="flex-1 min-w-36 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
					/>
					<input
						name="confirm"
						type="password"
						required
						placeholder="Confirm password"
						class="flex-1 min-w-36 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
					/>
					<button
						type="submit"
						class="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:border-[var(--color-muted)]"
					>
						Change password
					</button>
				</form>
			</div>
		</section>

		<!-- Guest access toggle -->
		<section class="mb-8">
			<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Access</h2>
			<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="font-medium text-[var(--color-text)]">Allow unregistered guests</p>
						<p class="mt-0.5 text-sm text-[var(--color-muted)]">
							When enabled, anyone with an invite link can join without an account by just picking a name.
							Disable this to require all members to have a registered account.
						</p>
					</div>
					<form method="post" action="?/toggleGuests" class="shrink-0">
						<input type="hidden" name="allowGuests" value={data.group.allowGuests ? '0' : '1'} />
						<button
							type="submit"
							aria-label={data.group.allowGuests ? 'Disable guest access' : 'Enable guest access'}
							class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors {data.group.allowGuests ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}"
						>
							<span class="inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform {data.group.allowGuests ? 'translate-x-6' : 'translate-x-1'}"></span>
						</button>
					</form>
				</div>
				{#if !data.group.allowGuests}
					<p class="mt-3 rounded-md bg-yellow-950/30 px-3 py-2 text-xs text-yellow-300">
						⚠️ Guests joining via invite link will be blocked. Only registered accounts can join.
					</p>
				{/if}
			</div>
		</section>

		<!-- Danger zone -->
		<section>
			<h2 class="mb-3 text-lg font-semibold text-red-400">Danger zone</h2>
			<div class="rounded-lg border border-red-900/50 bg-red-950/20 p-5">
				{#if !deleteConfirm}
					<button
						type="button"
						class="rounded-md border border-red-800 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30"
						onclick={() => (deleteConfirm = true)}
					>
						Delete group
					</button>
				{:else}
					<p class="mb-3 text-sm text-red-300">This will permanently delete the group, all members, invite links, and picks.</p>
					<div class="flex gap-3">
						<form method="post" action="?/deleteGroup">
							<button
								type="submit"
								class="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
							>
								Yes, delete everything
							</button>
						</form>
						<button
							type="button"
							class="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:border-[var(--color-muted)]"
							onclick={() => (deleteConfirm = false)}
						>
							Cancel
						</button>
					</div>
				{/if}
			</div>
		</section>
	{/if}
</div>
