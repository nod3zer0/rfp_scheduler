<script lang="ts">
	import MemberChip from '$lib/components/MemberChip.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeDay = $state<string>('');

	$effect(() => {
		if (!activeDay || !data.daysWithPicks.includes(activeDay as never)) {
			activeDay = data.daysWithPicks[0] ?? 'wednesday';
		}
	});

	const activePicks = $derived(data.byDay[activeDay as keyof typeof data.byDay] ?? []);

	// Pick toggling
	let myPickIds = $state(new Set<string>());
	let toggling = $state(new Set<string>());

	$effect(() => {
		myPickIds = new Set(data.myPickIds);
	});

	async function togglePick(scheduleId: string, bandName: string) {
		if (!data.currentMemberId || toggling.has(scheduleId)) return;
		const was = myPickIds.has(scheduleId);
		toggling = new Set([...toggling, scheduleId]);
		if (was) { myPickIds.delete(scheduleId); } else { myPickIds.add(scheduleId); }
		myPickIds = new Set(myPickIds);
		try {
			const res = await fetch('/api/picks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduleId })
			});
			if (!res.ok) throw new Error();
			const result = await res.json() as { picked: boolean };
			if (result.picked !== !was) {
				if (result.picked) myPickIds.add(scheduleId); else myPickIds.delete(scheduleId);
				myPickIds = new Set(myPickIds);
			}
		} catch {
			if (was) myPickIds.add(scheduleId); else myPickIds.delete(scheduleId);
			myPickIds = new Set(myPickIds);
			toastStore.error('Failed to save pick');
		} finally {
			toggling.delete(scheduleId);
			toggling = new Set(toggling);
		}
	}
</script>

<svelte:head>
	<title>{data.friend.name}'s picks — RFP Squad</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- Header -->
	<div class="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5">
		<div class="mx-auto max-w-2xl">
			<a href="/friends" class="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
				← Friends
			</a>
			<div class="flex items-center gap-4">
				<MemberChip name={data.friend.name} memberId={data.friend.id} customColor={data.friend.customColor} size="lg" />
				<div>
					<h1 class="text-xl font-bold text-[var(--color-text)]">
						{data.friend.name}
						{#if data.isSelf}<span class="ml-1 text-sm font-normal text-[var(--color-muted)]">(you)</span>{/if}
					</h1>
					<p class="text-sm text-[var(--color-muted)]">{data.totalPicks} picks</p>
				</div>
				<a
					href="/?member={data.friend.id}"
					class="ml-auto shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] hover:border-[var(--color-muted)] hover:text-[var(--color-text)]"
				>
					View on grid →
				</a>
			</div>
		</div>
	</div>

	{#if data.totalPicks === 0}
		<div class="flex flex-1 flex-col items-center justify-center py-20 text-center">
			<p class="text-4xl">🎵</p>
			<p class="mt-3 text-[var(--color-muted)]">No picks yet.</p>
		</div>
	{:else}
		<!-- Day tabs -->
		<div class="sticky top-[57px] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
			<div class="flex overflow-x-auto">
				{#each data.daysWithPicks as d (d)}
					<button
						type="button"
						class="shrink-0 border-b-2 px-5 py-3 text-sm font-medium transition-colors {d === activeDay
							? 'border-[var(--color-accent)] text-[var(--color-accent)]'
							: 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'}"
						onclick={() => (activeDay = d)}
					>
						{data.dayLabels[d]}
						<span class="ml-1 text-xs opacity-60">{data.byDay[d].length}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Pick list -->
		<div class="mx-auto w-full max-w-2xl px-4 py-4">
			{#if activePicks.length === 0}
				<p class="py-8 text-center text-[var(--color-muted)]">No picks for this day.</p>
			{:else}
				<div class="flex flex-col divide-y divide-[var(--color-border)]">
					{#each activePicks as pick (pick.id)}
						{@const isPicked = myPickIds.has(pick.id)}
						{@const isToggling = toggling.has(pick.id)}
						<div class="flex items-center gap-3 py-3.5 {isToggling ? 'opacity-60' : ''}">
							<!-- Time -->
							<div class="w-14 shrink-0 text-right">
								<p class="text-sm font-semibold tabular-nums text-[var(--color-text)]">{pick.timeStart}</p>
								<p class="text-[11px] text-[var(--color-muted)]">{pick.timeEnd}</p>
							</div>
							<!-- Color bar -->
							<div class="h-10 w-1 shrink-0 rounded-full {isPicked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'} opacity-70"></div>
							<!-- Info -->
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold {isPicked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}">{pick.band}</p>
								<p class="truncate text-xs text-[var(--color-muted)]">{pick.stage}</p>
							</div>
							<!-- Pick button -->
							{#if data.currentMemberId}
								<button
									type="button"
									onclick={() => togglePick(pick.id, pick.band)}
									disabled={isToggling}
									title={isPicked ? 'Remove pick' : 'Add to my picks'}
									class="shrink-0 text-xl leading-none transition-colors disabled:opacity-50 {isPicked ? 'text-[var(--color-accent)]' : 'text-[var(--color-border)] hover:text-[var(--color-muted)]'}"
								>
									{isPicked ? '★' : '☆'}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
