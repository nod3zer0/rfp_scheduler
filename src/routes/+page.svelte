<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import MemberChip from '$lib/components/MemberChip.svelte';
	import NowPlaying from '$lib/components/NowPlaying.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import { timeToMinutes } from '$lib/time.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const STAGES = [
		'Mastercard Stage',
		'Rock for People Stage',
		'E2 Stage',
		'Petr Svoboda Stage',
		'ČT art Stage',
		'Reflex Stage',
		'EcoFlow Stage',
		'Karaoke Stage'
	];

	// Time grid: 10:00 → 27:00 (03:00 next day = 27:00)
	const GRID_START = 10 * 60; // 600 minutes
	const GRID_END = 27 * 60; // 1620 minutes
	const GRID_TOTAL = GRID_END - GRID_START; // 1020 minutes

	function timeToPercent(time: string): number {
		return ((timeToMinutes(time) - GRID_START) / GRID_TOTAL) * 100;
	}

	function durationPercent(start: string, end: string): number {
		const s = timeToMinutes(start);
		let e = timeToMinutes(end);
		if (e <= s) e += 60; // minimum 1h for unknown end times
		return ((e - s) / GRID_TOTAL) * 100;
	}

	// Hour markers for the time axis
	const hourMarkers = Array.from({ length: 18 }, (_, i) => {
		const totalMin = GRID_START + i * 60;
		const h = Math.floor(totalMin / 60) % 24;
		return { label: `${String(h).padStart(2, '0')}:00`, pct: (i * 60 / GRID_TOTAL) * 100 };
	});

	// Optimistic picks state — syncs from server data on navigation
	let myPickIds = $state(new Set<string>());
	let picksMap = $state<Record<string, Array<{ id: string; name: string }>>>({});
	let toggling = $state(new Set<string>());

	$effect(() => {
		myPickIds = new Set(data.myPickIds);
		picksMap = structuredClone(data.picksMap);
	});

	async function togglePick(scheduleId: string, bandName: string) {
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

			const result = await res.json() as { picked: boolean };

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

	function changeDay(day: string) {
		const u = new URL($page.url);
		u.searchParams.set('day', day);
		u.searchParams.delete('member');
		goto(u.toString(), { invalidateAll: true });
	}

	// ── Filters (all local state) ──────────────────────────────────
	let filterMembers = $state<Set<string>>(new Set());
	// Seed from URL ?member= param for backward-compat deep links
	$effect(() => {
		if (data.memberFilter && filterMembers.size === 0) {
			filterMembers = new Set([data.memberFilter]);
		}
	});
	let filterMyPicks = $state(false);
	let filterHasPicks = $state(false);
	let hiddenStages = $state(new Set<string>());

	function toggleMember(id: string) {
		const next = new Set(filterMembers);
		if (next.has(id)) next.delete(id); else next.add(id);
		filterMembers = next;
	}

	function clearFilters() {
		filterMembers = new Set();
		filterMyPicks = false;
		filterHasPicks = false;
		hiddenStages = new Set();
	}

	const hasActiveFilter = $derived(
		filterMembers.size > 0 || filterMyPicks || filterHasPicks || hiddenStages.size > 0
	);

	function isBandVisible(scheduleId: string): boolean {
		if (filterMyPicks && !myPickIds.has(scheduleId)) return false;
		if (filterHasPicks && !(picksMap[scheduleId]?.length > 0)) return false;
		if (filterMembers.size > 0) {
			const pickers = picksMap[scheduleId] ?? [];
			if (!pickers.some((m) => filterMembers.has(m.id))) return false;
		}
		return true;
	}

	// Group event attend toggle
	let attendingIds = $state(new Set<string>());
	let attendToggles = $state(new Set<string>());

	$effect(() => {
		attendingIds = new Set(data.dayEvents.filter((e) => e.iAmAttending).map((e) => e.id));
	});

	async function toggleAttend(id: string) {
		if (attendToggles.has(id)) return;
		attendToggles = new Set([...attendToggles, id]);
		const was = attendingIds.has(id);
		if (was) attendingIds.delete(id); else attendingIds.add(id);
		attendingIds = new Set(attendingIds);
		try {
			const res = await fetch(`/api/group-events/${id}/attend`, { method: 'POST' });
			if (!res.ok) throw new Error();
			const result = await res.json() as { attending: boolean };
			if (result.attending !== !was) {
				if (result.attending) attendingIds.add(id); else attendingIds.delete(id);
				attendingIds = new Set(attendingIds);
			}
		} catch {
			if (was) attendingIds.add(id); else attendingIds.delete(id);
			attendingIds = new Set(attendingIds);
			toastStore.error('Failed to update attendance');
		} finally {
			attendToggles.delete(id);
			attendToggles = new Set(attendToggles);
		}
	}

	// Mobile stage selector
	let selectedStage = $state(STAGES[0]);

	$effect(() => {
		// reset stage when day changes
		void data.day;
		selectedStage = STAGES[0];
	});

	const mobileBands = $derived(
		data.schedule
			.filter((s) => s.stage === selectedStage)
			.sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart))
	);

	// For mobile: all bands across all stages + events merged and sorted
	type MobileItem =
		| { kind: 'band'; id: string; band: string; stage: string; timeStart: string; timeEnd: string }
		| { kind: 'event'; id: string; title: string; description: string | null; timeStart: string; timeEnd: string | null; attendees: Array<{ id: string; name: string }> };

	const mobileAllItems = $derived<MobileItem[]>(
		[
			...mobileBands
				.filter((b) => isBandVisible(b.id))
				.map((b): MobileItem => ({ kind: 'band', id: b.id, band: b.band, stage: b.stage, timeStart: b.timeStart, timeEnd: b.timeEnd })),
			...data.dayEvents.map((e): MobileItem => ({ kind: 'event', id: e.id, title: e.title, description: e.description, timeStart: e.timeStart, timeEnd: e.timeEnd, attendees: e.attendees }))
		].sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart))
	);
</script>

<svelte:head>
	<title>RFP Squad — Rock for People 2026</title>
</svelte:head>


{#if data.myTodayPicks.length > 0 || data.myTodayEvents.length > 0}
	<NowPlaying
		picks={data.myTodayPicks}
		events={data.myTodayEvents}
		picksMap={data.todayPicksMap}
		groupMembers={data.groupMembers}
		currentMemberId={data.currentMemberId}
	/>
{/if}

<!-- Day tabs -->
<div class="sticky top-[57px] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
	<div class="flex overflow-x-auto">
		{#each data.days as d (d.key)}
			<button
				type="button"
				class="shrink-0 border-b-2 px-5 py-3 text-sm font-medium transition-colors {d.key === data.day
					? 'border-[var(--color-accent)] text-[var(--color-accent)]'
					: 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'}"
				onclick={() => changeDay(d.key)}
			>
				{d.label}
			</button>
		{/each}

	</div>
</div>

<!-- ─── Filter bar ───────────────────────────────────────── -->
{#if data.groupMembers.length > 0}
	<div class="sticky top-[57px] z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]">

		<!-- Row 1: Member chips + pick toggles -->
		<div class="flex items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			<!-- Member chips -->
			{#if data.groupMembers.length > 1}
				{#each data.groupMembers as m (m.id)}
					{@const active = filterMembers.has(m.id)}
					<button
						type="button"
						onclick={() => toggleMember(m.id)}
						class="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors {active
							? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
							: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]'}"
					>
						<MemberChip name={m.name} size="sm" />
						{m.name}{m.id === data.currentMemberId ? ' (you)' : ''}
					</button>
				{/each}
			{/if}

			<!-- Divider -->
			{#if data.groupMembers.length > 1}
				<div class="mx-1 h-4 w-px shrink-0 bg-[var(--color-border)]"></div>
			{/if}

			<!-- My picks toggle -->
			{#if data.currentMemberId}
				<button
					type="button"
					onclick={() => (filterMyPicks = !filterMyPicks)}
					class="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors {filterMyPicks
						? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
						: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]'}"
				>
					★ My picks
				</button>
			{/if}

			<!-- Has group picks toggle -->
			{#if data.groupMembers.length > 1}
				<button
					type="button"
					onclick={() => (filterHasPicks = !filterHasPicks)}
					class="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors {filterHasPicks
						? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
						: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]'}"
				>
					👥 Has picks
				</button>
			{/if}

			<!-- Clear all -->
			{#if hasActiveFilter}
				<button
					type="button"
					onclick={clearFilters}
					class="shrink-0 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)] hover:border-red-700 hover:text-red-400"
				>
					✕ Clear
				</button>
			{/if}
		</div>

		<!-- Row 2 (desktop only): Stage column toggles -->
		<div class="hidden items-center gap-1.5 overflow-x-auto border-t border-[var(--color-border)] px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex">
			<span class="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Stages</span>
			{#each STAGES as stage}
				{@const hidden = hiddenStages.has(stage)}
				<button
					type="button"
					onclick={() => {
						const next = new Set(hiddenStages);
						if (hidden) next.delete(stage); else next.add(stage);
						hiddenStages = next;
					}}
					class="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors {hidden
						? 'border-[var(--color-border)] text-[var(--color-border)] line-through opacity-40'
						: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]'}"
				>
					{stage.replace(' Stage', '')}
				</button>
			{/each}
		</div>
	</div>
{/if}

{#if data.schedule.length === 0 && data.dayEvents.length === 0}
	<div class="flex flex-col items-center justify-center py-24 text-center">
		<p class="text-[var(--color-muted)]">No schedule loaded yet.</p>
		<p class="mt-1 text-sm text-[var(--color-muted)]">Check back later or ask the admin to sync.</p>
	</div>
{:else}
	<!-- ─── MOBILE: Stage selector + list ─────────────────────── -->
	<div class="md:hidden">
		<!-- Stage pills — sticky below filter bar; offset approximated, scrolls with content -->
		<div class="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
			<div class="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{#each STAGES as stage}
					<button
						type="button"
						onclick={() => (selectedStage = stage)}
						class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors {selectedStage === stage
							? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
							: 'border-[var(--color-border)] text-[var(--color-muted)]'}"
					>
						{stage.replace(' Stage', '')}
					</button>
				{/each}
			</div>
		</div>

		<!-- Band list for selected stage (+ events mixed in) -->
		{#if mobileAllItems.length === 0}
			<p class="py-12 text-center text-sm text-[var(--color-muted)]">No bands for this stage today.</p>
		{:else}
			<div class="divide-y divide-[var(--color-border)]">
				{#each mobileAllItems as item (item.id)}
					{#if item.kind === 'event'}
						{@const iAm = attendingIds.has(item.id)}
						{@const toggling = attendToggles.has(item.id)}
						<div class="flex items-start gap-3 bg-blue-950/15 px-4 py-3.5">
							<div class="w-14 shrink-0 text-right">
								<p class="text-sm font-semibold tabular-nums text-blue-300">{item.timeStart}</p>
								{#if item.timeEnd}<p class="text-[11px] text-blue-400/70">{item.timeEnd}</p>{/if}
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold text-[var(--color-text)]">📅 {item.title}</p>
								{#if item.description}
									<p class="truncate text-xs text-[var(--color-muted)]">{item.description}</p>
								{/if}
								{#if item.attendees.length > 0}
									<div class="mt-1 flex flex-wrap gap-0.5">
										{#each item.attendees as att (att.id)}
											<MemberChip name={att.name} size="sm" />
										{/each}
									</div>
								{/if}
							</div>
							{#if data.currentMemberId}
								<button
									type="button"
									onclick={() => toggleAttend(item.id)}
									disabled={toggling}
									class="mt-0.5 shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 {iAm
										? 'border-blue-600 bg-blue-900/50 text-blue-300'
										: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-blue-600 hover:text-blue-300'}"
								>
									{iAm ? '✓ In' : '+ Join'}
								</button>
							{/if}
						</div>
					{:else}
						{@const isPicked = myPickIds.has(item.id)}
						{@const muted = !isBandVisible(item.id)}
						{@const bandPickers = (picksMap[item.id] ?? []).slice(0, 6)}
						{@const overflow = Math.max(0, (picksMap[item.id] ?? []).length - 6)}
						<button
							type="button"
							onclick={() => togglePick(item.id, item.band)}
							class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[var(--color-surface)] {isPicked
								? 'bg-[var(--color-accent)]/5'
								: ''} {muted ? 'opacity-30' : ''} {toggling.has(item.id) ? 'opacity-60' : ''}"
						>
							<div class="w-14 shrink-0 text-right">
								<p class="text-sm font-semibold tabular-nums text-[var(--color-text)]">{item.timeStart}</p>
								<p class="text-[11px] text-[var(--color-muted)]">{item.timeEnd}</p>
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold leading-snug {isPicked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}">
									{item.band}
								</p>
								{#if bandPickers.length > 0}
									<div class="mt-1 flex flex-wrap gap-0.5">
										{#each bandPickers as picker (picker.id)}
											<MemberChip name={picker.name} size="sm" />
										{/each}
										{#if overflow > 0}
											<span class="text-[10px] text-[var(--color-muted)]">+{overflow}</span>
										{/if}
									</div>
								{/if}
							</div>
							<div class="shrink-0 text-xl leading-none {isPicked ? 'text-[var(--color-accent)]' : 'text-[var(--color-border)]'}">
								{isPicked ? '★' : '☆'}
							</div>
						</button>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- ─── DESKTOP: Full grid ────────────────────────────────── -->
	<div class="hidden md:flex overflow-x-auto">
		<!-- Time axis -->
		<div class="relative w-12 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)]" style="height: 1700px">
			{#each hourMarkers as marker}
				<div
					class="absolute right-0 -translate-y-1/2 pr-1.5 text-[10px] text-[var(--color-muted)]"
					style="top: {marker.pct}%"
				>
					{marker.label}
				</div>
			{/each}
		</div>

		<!-- Group Events column -->
		{#if data.dayEvents.length > 0}
			<div class="relative shrink-0 border-r border-blue-900/60 bg-blue-950/10" style="width:180px; height:1700px">
				<!-- Column header -->
				<div class="sticky top-[97px] z-20 flex items-center justify-between gap-1 border-b border-blue-900/60 bg-blue-950/30 px-2 py-1.5">
					<p class="text-center text-xs font-semibold text-blue-300">📅 Group Events</p>
					<a href="/overview?day={data.day}" class="text-[10px] text-blue-400/70 hover:text-blue-300">Manage</a>
				</div>

				<!-- Hour grid lines -->
				{#each hourMarkers as marker}
					<div
						class="absolute left-0 right-0 border-t border-blue-900/20"
						style="top: calc({marker.pct}% + 32px)"
					></div>
				{/each}

				<!-- Event blocks -->
				{#each data.dayEvents as ev (ev.id)}
					{@const iAm = attendingIds.has(ev.id)}
					{@const isBusy = attendToggles.has(ev.id)}
					{@const top = timeToPercent(ev.timeStart)}
					{@const height = ev.timeEnd
						? durationPercent(ev.timeStart, ev.timeEnd)
						: (60 / GRID_TOTAL) * 100}
					<div
						class="absolute left-1 right-1 flex flex-col overflow-hidden rounded-lg border p-1.5 transition-all {iAm
							? 'border-blue-500 bg-blue-900/60'
							: 'border-blue-900/70 bg-blue-950/40 hover:border-blue-700'}"
						style="top: calc({top}% + 32px); height: calc({height}% - 4px); min-height: 44px;"
					>
						<p class="truncate text-[11px] font-semibold leading-tight text-blue-200">{ev.title}</p>
						<p class="text-[9px] tabular-nums text-blue-400">{ev.timeStart}{ev.timeEnd ? `–${ev.timeEnd}` : ''}</p>
						{#if ev.attendees.length > 0}
							<div class="mt-0.5 flex flex-wrap gap-0.5">
								{#each ev.attendees.slice(0, 4) as att (att.id)}
									<MemberChip name={att.name} size="sm" />
								{/each}
								{#if ev.attendees.length > 4}
									<span class="text-[9px] text-blue-400">+{ev.attendees.length - 4}</span>
								{/if}
							</div>
						{/if}
						{#if data.currentMemberId}
							<button
								type="button"
								onclick={() => toggleAttend(ev.id)}
								disabled={isBusy}
								class="mt-auto shrink-0 self-start rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 {iAm
									? 'border-blue-600 text-blue-300 hover:border-red-700 hover:text-red-300'
									: 'border-blue-800 text-blue-400 hover:border-blue-500 hover:text-blue-200'}"
							>
								{iAm ? '✓ In' : '+ Join'}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Stage columns -->
		<div class="flex flex-1 gap-0">
			{#each STAGES as stage}
				{#if !hiddenStages.has(stage)}
				{@const stageBands = data.schedule.filter((s) => s.stage === stage)}
				<div class="relative flex-1 min-w-36 border-r border-[var(--color-border)]" style="height: 1700px">
					<!-- Stage header -->
					<div class="sticky top-[97px] z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
						<p class="text-center text-xs font-semibold leading-tight text-[var(--color-text)]">{stage}</p>
					</div>

					<!-- Hour grid lines -->
					{#each hourMarkers as marker}
						<div
							class="absolute left-0 right-0 border-t border-[var(--color-border)] opacity-30"
							style="top: {marker.pct}%"
						></div>
					{/each}

					<!-- Band blocks -->
					{#each stageBands as band (band.id)}
						{@const isPicked = myPickIds.has(band.id)}
						{@const visible = isBandVisible(band.id)}
						{@const bandPickers = (picksMap[band.id] ?? []).slice(0, 5)}
						{@const overflow = Math.max(0, (picksMap[band.id] ?? []).length - 5)}
						{@const top = timeToPercent(band.timeStart)}
						{@const height = durationPercent(band.timeStart, band.timeEnd)}
						<button
							type="button"
							class="absolute left-0.5 right-0.5 overflow-hidden rounded p-1.5 text-left transition-all {isPicked
								? 'border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/20 ring-1 ring-[var(--color-accent)]/40'
								: 'border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)] hover:bg-[var(--color-surface-2)]'} {!visible
								? 'opacity-15 saturate-0'
								: ''} {toggling.has(band.id) ? 'opacity-70' : ''}"
							style="top: calc({top}% + 32px); height: calc({height}% - 4px); min-height: 32px;"
							onclick={() => togglePick(band.id, band.band)}
							title="{band.band} — {band.timeStart}–{band.timeEnd}"
						>
							<p class="truncate text-[11px] font-semibold leading-tight text-[var(--color-text)]">
								{band.band}
							</p>
							<p class="text-[9px] leading-tight text-[var(--color-muted)]">
								{band.timeStart}–{band.timeEnd}
							</p>
							{#if bandPickers.length > 0}
								<div class="mt-0.5 flex flex-wrap gap-0.5">
									{#each bandPickers as picker (picker.id)}
										<MemberChip name={picker.name} size="sm" />
									{/each}
									{#if overflow > 0}
										<span class="text-[9px] text-[var(--color-muted)]">+{overflow}</span>
									{/if}
								</div>
							{/if}
						</button>
					{/each}
				</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}
