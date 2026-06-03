<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import MemberChip from '$lib/components/MemberChip.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	// Switch active group for registered users
	async function switchGroup(groupId: string, memberId: string) {
		const userId = data.user?.id;
		if (!userId) return;
		const payload = JSON.stringify({ userId, memberId, groupId });
		document.cookie = `rfp_identity=${encodeURIComponent(payload)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
		window.location.href = '/';
	}
</script>

<div class="flex min-h-screen flex-col">
	<nav class="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
		<div class="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3">
			<a href="/" class="flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]">
				<span class="text-[var(--color-accent)]">🎸</span> RFP Squad
			</a>

			{#if data.group}
				{#if data.user && data.myGroups.length > 1}
					<div class="relative hidden sm:block">
						<details class="group/sw">
							<summary class="flex cursor-pointer list-none items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]">
								{data.group.name} <span class="opacity-60">▾</span>
							</summary>
							<div class="absolute top-full left-0 z-50 mt-1 min-w-[180px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
								{#each data.myGroups as g (g.groupId)}
									<button
										type="button"
										onclick={() => switchGroup(g.groupId, g.memberId)}
										class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-2)] {g.groupId === data.group?.id ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}"
									>
										{#if g.groupId === data.group?.id}<span class="text-[10px]">✓</span>{/if}
										{g.groupName}
									</button>
								{/each}
							</div>
						</details>
					</div>
				{:else}
					<span class="hidden text-xs text-[var(--color-muted)] sm:inline">{data.group.name}</span>
				{/if}
			{/if}

			<div class="ml-auto flex items-center gap-3">
				{#if data.member}
					<a href="/overview" class="hidden text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] sm:inline">Overview</a>
					<a href="/friends" class="hidden text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] sm:inline">Friends</a>
					{#if data.group}
						<a href="/groups/{data.group.id}/manage" class="hidden text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] sm:inline">Manage</a>
					{/if}
				{/if}

				{#if data.user}
					<details class="group/id relative">
						<summary class="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:border-[var(--color-muted)] hover:bg-[var(--color-surface)]">
							<MemberChip
								name={data.user.name}
								size="sm"
								avatarUrl={data.user.pictureUrl ?? undefined}
							/>
							<span class="max-w-[120px] truncate">{data.user.name}</span>
							<span class="text-[var(--color-muted)]">▾</span>
						</summary>
						<div class="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg">
							<a href="/account/groups" class="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
								👥 My groups
								{#if data.myGroups.length > 0}
									<span class="ml-auto rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">{data.myGroups.length}</span>
								{/if}
							</a>
							<a href="/account/settings" class="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-2)]">
								⚙️ Settings
							</a>
							<div class="my-1 border-t border-[var(--color-border)]"></div>
							<form method="POST" action="/account/logout">
								<button type="submit" class="flex w-full items-center gap-2 px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-red-400">
									Sign out
								</button>
							</form>
						</div>
					</details>
				{:else}
					<a href="/account/login" class="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">Sign in</a>
					<a href="/account/register" class="rounded-md border border-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)] hover:text-white">
						Register
					</a>
				{/if}
			</div>
		</div>
	</nav>

	<!-- Logged-in but not in a group yet -->
	{#if data.user && !data.group}
		<div class="border-b border-blue-900/50 bg-blue-950/30 px-4 py-2.5 text-center text-sm text-blue-200">
			You're logged in as <strong>{data.user.name}</strong> but not in any group yet.
			<a href="/groups/new" class="mx-1 underline underline-offset-2 hover:text-white">Create a group</a>
			or join one via an invite link.
		</div>
	{/if}

	<main class="flex-1 pb-16 sm:pb-0">
		{@render children()}
	</main>

	<!-- Mobile bottom navigation -->
	{#if data.member}
		<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg)] sm:hidden">
			<div class="flex">
				<a href="/" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
					<span class="text-xl">🗓</span>
					<span class="text-[10px] font-medium">Schedule</span>
				</a>
				<a href="/overview" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
					<span class="text-xl">👥</span>
					<span class="text-[10px] font-medium">Overview</span>
				</a>
				<a href="/map" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
					<span class="text-xl">🗺️</span>
					<span class="text-[10px] font-medium">Map</span>
				</a>
				<a href="/friends" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
					<span class="text-xl">⭐</span>
					<span class="text-[10px] font-medium">Friends</span>
				</a>
				{#if data.group}
					<a href="/groups/{data.group.id}/manage" class="flex flex-1 flex-col items-center gap-0.5 py-3 text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]">
						<span class="text-xl">⚙️</span>
						<span class="text-[10px] font-medium">Manage</span>
					</a>
				{/if}
			</div>
		</nav>
	{/if}
</div>

<footer class="border-t border-[var(--color-border)] px-4 py-4 text-center text-xs text-[var(--color-muted)] sm:pb-4 pb-20">
	© {new Date().getFullYear()} René Česka ·
	<a
		href="https://github.com/nod3zer0/rfp_scheduler"
		target="_blank"
		rel="noopener noreferrer"
		class="hover:text-[var(--color-text)] transition-colors"
	>github.com/nod3zer0/rfp_scheduler</a>
</footer>

<Toast />
