<script lang="ts">
	import MemberChip from '$lib/components/MemberChip.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Friends — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-10">
	<div class="mb-5 flex items-center gap-3">
		<a href="/" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">← Schedule</a>
		<h1 class="text-2xl font-bold text-[var(--color-text)]">Friends</h1>
	</div>

	{#if data.members.length === 0}
		<p class="text-[var(--color-muted)]">No members yet. Share the invite link with your friends!</p>
	{:else}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
			{#each data.members as m (m.id)}
				<a
					href="/friends/{m.id}"
					class="flex flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center transition-all hover:border-[var(--color-muted)] hover:bg-[var(--color-surface-2)] {m.id === data.currentMemberId ? 'ring-2 ring-[var(--color-accent)]' : ''}"
				>
					<MemberChip name={m.name} size="lg" />
					<div>
						<p class="font-medium text-[var(--color-text)]">
							{m.name}
							{#if m.id === data.currentMemberId}
								<span class="ml-1 text-xs text-[var(--color-muted)]">(you)</span>
							{/if}
						</p>
						<p class="text-xs text-[var(--color-muted)]">{m.pickCount} picks</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
