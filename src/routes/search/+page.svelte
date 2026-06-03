<script lang="ts">
	import { goto } from '$app/navigation';
	import MemberChip from '$lib/components/MemberChip.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');

	// Optimistic picks state
	let myPickIds = $state(new Set<string>());
	let toggling = $state(new Set<string>());

	$effect(() => {
		myPickIds = new Set(data.myPickIds);
	});

	const filteredBands = $derived(() => {
		if (!searchQuery.trim()) return [];
		const q = searchQuery.toLowerCase();
		return data.allSchedule.filter((s) => s.band.toLowerCase().includes(q));
	});

	async function togglePick(scheduleId: string) {
		if (toggling.has(scheduleId)) return;

		const wasPicked = myPickIds.has(scheduleId);
		toggling = new Set([...toggling, scheduleId]);

		// Optimistic update
		if (wasPicked) {
			myPickIds.delete(scheduleId);
			myPickIds = new Set(myPickIds);
		} else {
			myPickIds.add(scheduleId);
			myPickIds = new Set(myPickIds);
		}

		try {
			const res = await fetch('/api/picks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduleId })
			});

			if (!res.ok) throw new Error('Request failed');

			const result = (await res.json()) as { picked: boolean };

			if (result.picked !== !wasPicked) {
				// Server disagreed, sync
				if (result.picked) myPickIds.add(scheduleId);
				else myPickIds.delete(scheduleId);
				myPickIds = new Set(myPickIds);
			}
		} catch {
			// Revert
			if (wasPicked) {
				myPickIds.add(scheduleId);
			} else {
				myPickIds.delete(scheduleId);
			}
			myPickIds = new Set(myPickIds);
			toastStore.error('Failed to save pick');
		} finally {
			toggling.delete(scheduleId);
			toggling = new Set(toggling);
		}
	}

	function goToSchedule(day: string) {
		goto(`/?day=${day}`);
	}
</script>

<svelte:head>
	<title>Band Search — RFP Squad</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-6">
	<h1 class="mb-6 text-2xl font-bold text-[var(--color-text)]">Band Search</h1>

	<div class="mb-6">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search for a band..."
			autofocus
			class="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-lg text-[var(--color-text)] placeholder-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-none"
		/>
	</div>

	{#if searchQuery.trim() && filteredBands().length === 0}
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
			<p class="text-[var(--color-muted)]">No bands found for "{searchQuery}"</p>
		</div>
	{:else if filteredBands().length > 0}
		<div class="space-y-2">
			{#each filteredBands() as band (band.id)}
				{@const isPicked = myPickIds.has(band.id)}
				{@const pickers = (data.picksMap[band.id] ?? []).slice(0, 5)}
				{@const overflow = Math.max(0, (data.picksMap[band.id] ?? []).length - 5)}
				<div
					class="flex items-center gap-3 rounded-lg border p-4 transition-colors {isPicked
						? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
						: 'border-[var(--color-border)] bg-[var(--color-surface)]'}"
				>
					<div class="flex-1">
						<div class="flex items-baseline gap-2">
							<h3 class="text-lg font-semibold text-[var(--color-text)]">{band.band}</h3>
							<button
								type="button"
								onclick={() => goToSchedule(band.day)}
								class="text-sm text-[var(--color-accent)] hover:underline"
							>
								{band.dayLabel}
							</button>
						</div>
						<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
							<span>{band.stage}</span>
							<span>·</span>
							<span class="tabular-nums">{band.timeStart}–{band.timeEnd}</span>
						</div>
						{#if pickers.length > 0}
							<div class="mt-2 flex flex-wrap items-center gap-1">
								{#each pickers as picker (picker.id)}
									<MemberChip name={picker.name} memberId={picker.id} customColor={picker.customColor} size="sm" />
								{/each}
								{#if overflow > 0}
									<span class="text-xs text-[var(--color-muted)]">+{overflow}</span>
								{/if}
							</div>
						{/if}
					</div>
					<button
						type="button"
						onclick={() => togglePick(band.id)}
						disabled={toggling.has(band.id)}
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-2xl transition-all disabled:opacity-50 {isPicked
							? 'border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20'
							: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'}"
					>
						{isPicked ? '★' : '☆'}
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
			<p class="text-[var(--color-muted)]">Start typing to search for bands</p>
		</div>
	{/if}
</div>
