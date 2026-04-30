<script lang="ts">
	import type { PageData } from './$types';

	// PageData inherits layout data (myGroups, user, group) automatically in SvelteKit
	let { data }: { data: PageData & { myGroups: Array<{ groupId: string; groupName: string; memberId: string }>; user: { id: string; name: string } | null; group: { id: string; name: string } | null } } = $props();

	function switchGroup(groupId: string, memberId: string) {
		const userId = data.user?.id;
		if (!userId) return;
		const payload = JSON.stringify({ userId, memberId, groupId });
		document.cookie = `rfp_identity=${encodeURIComponent(payload)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
		window.location.href = '/';
	}
</script>

<svelte:head>
	<title>My Groups — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-12">
	<div class="mb-8">
		<a href="/" class="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">← Back</a>
		<h1 class="text-2xl font-bold text-[var(--color-text)]">My Groups</h1>
		<p class="mt-1 text-sm text-[var(--color-muted)]">Switch between your festival squads</p>
	</div>

	{#if data.myGroups.length === 0}
		<div class="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
			<p class="text-3xl">🎪</p>
			<p class="mt-3 text-[var(--color-muted)]">You're not in any group yet.</p>
			<p class="mt-1 text-sm text-[var(--color-muted)]">Create one or join via an invite link.</p>
			<a
				href="/groups/new"
				class="mt-4 inline-block rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
			>
				+ Create group
			</a>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each data.myGroups as g (g.groupId)}
				{@const isActive = g.groupId === data.group?.id}
				<div class="flex items-center gap-4 rounded-xl border px-4 py-3.5 {isActive ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]'}">
					<div class="min-w-0 flex-1">
						<p class="font-semibold text-[var(--color-text)]">{g.groupName}</p>
						{#if isActive}
							<p class="text-xs text-[var(--color-accent)]">Currently active</p>
						{/if}
					</div>
					{#if isActive}
						<span class="rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-medium text-[var(--color-accent)]">Active</span>
					{:else}
						<button
							type="button"
							onclick={() => switchGroup(g.groupId, g.memberId)}
							class="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
						>
							Switch →
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<div class="mt-6">
			<a
				href="/groups/new"
				class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] py-3 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
			>
				+ Create another group
			</a>
		</div>
	{/if}
</div>
