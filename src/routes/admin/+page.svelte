<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toastStore } from '$lib/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let syncing = $state(false);
	let restoring = $state<string | null>(null);
	let editingLabel = $state<string | null>(null);
	let labelValue = $state('');
	let resettingPassword = $state<string | null>(null);
	let newPassword = $state('');

	async function syncNow() {
		if (syncing) return;
		syncing = true;
		try {
			const res = await fetch('/api/admin/sync-schedule', { method: 'POST' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const result = await res.json() as { added: number; updated: number; deleted: number };
			toastStore.success(`Sync done: +${result.added} ~${result.updated} -${result.deleted}`);
			await invalidateAll();
		} catch (e) {
			toastStore.error('Sync failed');
		} finally {
			syncing = false;
		}
	}

	async function restoreSnapshot(snapshotId: string) {
		if (!confirm('Replace live schedule with this snapshot? Picks for removed bands will be deleted.')) return;
		restoring = snapshotId;
		try {
			const res = await fetch('/api/admin/restore-snapshot', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ snapshotId })
			});
			if (!res.ok) throw new Error();
			const result = await res.json() as { restoredCount: number };
			toastStore.success(`Restored ${result.restoredCount} bands`);
			await invalidateAll();
		} catch {
			toastStore.error('Restore failed');
		} finally {
			restoring = null;
		}
	}

	function startEditLabel(id: string, current: string | null) {
		editingLabel = id;
		labelValue = current ?? '';
	}

	function startResetPassword(userId: string) {
		resettingPassword = userId;
		newPassword = '';
	}

	function cancelResetPassword() {
		resettingPassword = null;
		newPassword = '';
	}

	async function saveLabel(id: string) {
		try {
			const res = await fetch(`/api/admin/snapshot/${id}/label`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ label: labelValue })
			});
			if (!res.ok) throw new Error();
			toastStore.success('Label saved');
			await invalidateAll();
		} catch {
			toastStore.error('Failed to save label');
		} finally {
			editingLabel = null;
		}
	}
</script>

<svelte:head>
	<title>Admin — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-[var(--color-text)]">Admin Panel</h1>
		<a href="/" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">← Back to app</a>
	</div>

	<!-- Schedule Sync -->
	<section class="mb-10">
		<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Schedule Sync</h2>
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
			<p class="mb-3 text-sm text-[var(--color-muted)]">
				Last sync: {data.lastSyncAt ? new Date(data.lastSyncAt).toLocaleString() : 'Never'}
			</p>
			<button
				type="button"
				class="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
				disabled={syncing}
				onclick={syncNow}
			>
				{syncing ? 'Syncing…' : 'Sync now'}
			</button>
		</div>
	</section>

	<!-- Snapshot History -->
	<section class="mb-10">
		<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Snapshot History</h2>
		{#if data.snapshots.length === 0}
			<p class="text-sm text-[var(--color-muted)]">No snapshots yet.</p>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
				<table class="w-full text-sm">
					<thead class="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
						<tr>
							<th class="px-4 py-2 text-left">Time</th>
							<th class="px-4 py-2 text-left">Source</th>
							<th class="px-4 py-2 text-left">Changes</th>
							<th class="px-4 py-2 text-left">Label</th>
							<th class="px-4 py-2 text-left">Status</th>
							<th class="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.snapshots as s (s.id)}
							<tr class="border-t border-[var(--color-border)]">
								<td class="px-4 py-2 text-[var(--color-muted)]">
									{new Date(s.scrapedAt).toLocaleString()}
								</td>
								<td class="px-4 py-2">
									<span class="rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-xs">{s.source}</span>
								</td>
								<td class="px-4 py-2 font-mono text-xs">
									<span class="text-green-400">+{s.addedCount}</span>
									<span class="text-yellow-400"> ~{s.updatedCount}</span>
									<span class="text-red-400"> -{s.deletedCount}</span>
								</td>
								<td class="px-4 py-2">
									{#if editingLabel === s.id}
										<div class="flex gap-1">
											<input
												type="text"
												bind:value={labelValue}
												class="w-32 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 text-xs outline-none focus:border-[var(--color-accent)]"
												onkeydown={(e) => { if (e.key === 'Enter') saveLabel(s.id); if (e.key === 'Escape') editingLabel = null; }}
											/>
											<button
												type="button"
												class="text-xs text-green-400 hover:text-green-300"
												onclick={() => saveLabel(s.id)}
											>✓</button>
											<button
												type="button"
												class="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
												onclick={() => (editingLabel = null)}
											>✕</button>
										</div>
									{:else}
										<button
											type="button"
											class="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
											onclick={() => startEditLabel(s.id, s.label ?? null)}
										>
											{s.label ?? '+ add label'}
										</button>
									{/if}
								</td>
								<td class="px-4 py-2">
									{#if s.isActive}
										<span class="rounded bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-400">ACTIVE</span>
									{/if}
								</td>
								<td class="px-4 py-2">
									<button
										type="button"
										class="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
										disabled={s.isActive || restoring === s.id}
										onclick={() => restoreSnapshot(s.id)}
									>
										{restoring === s.id ? 'Restoring…' : 'Restore'}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Groups -->
	<section class="mb-10">
		<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Groups</h2>
		{#if data.groups.length === 0}
			<p class="text-sm text-[var(--color-muted)]">No groups yet.</p>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
				<table class="w-full text-sm">
					<thead class="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
						<tr>
							<th class="px-4 py-2 text-left">Name</th>
							<th class="px-4 py-2 text-left">Members</th>
							<th class="px-4 py-2 text-left">Created</th>
							<th class="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.groups as g (g.id)}
							<tr class="border-t border-[var(--color-border)]">
								<td class="px-4 py-2 font-medium text-[var(--color-text)]">
									<a href="/groups/{g.id}/manage" class="hover:text-[var(--color-accent)]">{g.name}</a>
								</td>
								<td class="px-4 py-2 text-[var(--color-muted)]">{g.memberCount}</td>
								<td class="px-4 py-2 text-[var(--color-muted)]">{new Date(g.createdAt).toLocaleDateString()}</td>
								<td class="px-4 py-2">
									<form
										method="post"
										action="?/deleteGroup"
										use:enhance={() => {
											if (!confirm(`Delete group "${g.name}"? This cannot be undone.`)) {
												return () => {};
											}
											return async ({ update }) => update();
										}}
									>
										<input type="hidden" name="groupId" value={g.id} />
										<button type="submit" class="text-xs text-red-400 hover:text-red-300">Delete</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Users -->
	<section class="mb-10">
		<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Registered Users</h2>
		{#if data.users.length === 0}
			<p class="text-sm text-[var(--color-muted)]">No registered users yet.</p>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
				<table class="w-full text-sm">
					<thead class="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
						<tr>
							<th class="px-4 py-2 text-left">Name</th>
							<th class="px-4 py-2 text-left">Created</th>
							<th class="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.users as u (u.id)}
							<tr class="border-t border-[var(--color-border)]">
								<td class="px-4 py-2 font-medium text-[var(--color-text)]">{u.name}</td>
								<td class="px-4 py-2 text-[var(--color-muted)]">{new Date(u.createdAt).toLocaleDateString()}</td>
								<td class="px-4 py-2">
									{#if resettingPassword === u.id}
										<form
											method="post"
											action="?/resetPassword"
											use:enhance={({ cancel }) => {
												if (!newPassword || newPassword.length < 6) {
													toastStore.error('Password must be at least 6 characters');
													cancel();
													return;
												}
												return async ({ result, update }) => {
													if (result.type === 'success') {
														toastStore.success(`Password reset for ${u.name}`);
														cancelResetPassword();
													} else if (result.type === 'failure' && result.data) {
														toastStore.error((result.data as { error?: string }).error ?? 'Failed to reset password');
													}
													await update();
												};
											}}
										>
											<input type="hidden" name="userId" value={u.id} />
											<div class="flex items-center gap-2">
												<input
													type="password"
													name="newPassword"
													bind:value={newPassword}
													placeholder="New password"
													class="w-32 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
													autocomplete="off"
												/>
												<button
													type="submit"
													class="text-xs text-green-400 hover:text-green-300"
												>Set</button>
												<button
													type="button"
													class="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
													onclick={cancelResetPassword}
												>Cancel</button>
											</div>
										</form>
									{:else}
										<button
											type="button"
											class="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
											onclick={() => startResetPassword(u.id)}
										>
											Reset password
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Members -->
	<section>
		<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">Members</h2>
		{#if data.members.length === 0}
			<p class="text-sm text-[var(--color-muted)]">No members yet.</p>
		{:else}
			<div class="overflow-x-auto rounded-lg border border-[var(--color-border)]">
				<table class="w-full text-sm">
					<thead class="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
						<tr>
							<th class="px-4 py-2 text-left">Name</th>
							<th class="px-4 py-2 text-left">Group</th>
							<th class="px-4 py-2 text-left">Joined</th>
							<th class="px-4 py-2 text-left">Picks</th>
							<th class="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.members as m (m.id)}
							<tr class="border-t border-[var(--color-border)]">
								<td class="px-4 py-2 font-medium text-[var(--color-text)]">{m.name}</td>
								<td class="px-4 py-2 text-[var(--color-muted)]">{m.groupName}</td>
								<td class="px-4 py-2 text-[var(--color-muted)]">{new Date(m.createdAt).toLocaleDateString()}</td>
								<td class="px-4 py-2 text-[var(--color-muted)]">{m.pickCount}</td>
								<td class="px-4 py-2">
									<form
										method="post"
										action="?/removeMember"
										use:enhance={() => {
											if (!confirm(`Remove ${m.name}?`)) return () => {};
											return async ({ update }) => update();
										}}
									>
										<input type="hidden" name="memberId" value={m.id} />
										<button type="submit" class="text-xs text-red-400 hover:text-red-300">Remove</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
