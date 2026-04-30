<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import MemberChip from '$lib/components/MemberChip.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Multi-member filter
	let filteredMemberIds = $state(new Set<string>());

	function toggleMemberFilter(id: string) {
		const next = new Set(filteredMemberIds);
		if (next.has(id)) next.delete(id); else next.add(id);
		filteredMemberIds = next;
	}

	const visibleBands = $derived(
		filteredMemberIds.size > 0
			? data.bandEntries.filter((b) => b.pickers.some((p) => filteredMemberIds.has(p.id)))
			: data.bandEntries
	);

	function changeDay(day: string) {
		const u = new URL($page.url);
		u.searchParams.set('day', day);
		goto(u.toString(), { invalidateAll: true });
	}

	// ── Band pick toggling ──────────────────────────────────────────
	let myPickIds = $state(new Set<string>());
	let pickToggling = $state(new Set<string>());

	$effect(() => {
		myPickIds = new Set(data.bandEntries.filter((b) => b.isMyPick).map((b) => b.id));
	});

	async function togglePick(scheduleId: string, bandName: string) {
		if (!data.currentMemberId || pickToggling.has(scheduleId)) return;
		const was = myPickIds.has(scheduleId);
		pickToggling = new Set([...pickToggling, scheduleId]);
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
			await invalidateAll();
		} catch {
			if (was) myPickIds.add(scheduleId); else myPickIds.delete(scheduleId);
			myPickIds = new Set(myPickIds);
			toastStore.error('Failed to save pick');
		} finally {
			pickToggling.delete(scheduleId);
			pickToggling = new Set(pickToggling);
		}
	}

	// ── Add event form ──────────────────────────────────────────────
	let showAddEvent = $state(false);
	let addingEvent = $state(false);
	let newEvent = $state({ title: '', timeStart: '', timeEnd: '', description: '' });

	async function submitEvent() {
		if (!newEvent.title.trim() || !newEvent.timeStart.trim()) return;
		addingEvent = true;
		try {
			const res = await fetch('/api/group-events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...newEvent, day: data.day })
			});
			if (!res.ok) throw new Error();
			toastStore.success('Event added');
			newEvent = { title: '', timeStart: '', timeEnd: '', description: '' };
			showAddEvent = false;
			await invalidateAll();
		} catch {
			toastStore.error('Failed to add event');
		} finally {
			addingEvent = false;
		}
	}

	// ── Edit event ──────────────────────────────────────────────────
	type EditState = { title: string; timeStart: string; timeEnd: string; description: string };
	let editingEventId = $state<string | null>(null);
	let editState = $state<EditState>({ title: '', timeStart: '', timeEnd: '', description: '' });
	let saving = $state(false);

	function startEdit(ev: typeof data.events[0]) {
		editingEventId = ev.id;
		editState = {
			title: ev.title,
			timeStart: ev.timeStart,
			timeEnd: ev.timeEnd ?? '',
			description: ev.description ?? ''
		};
	}

	async function saveEdit(id: string) {
		saving = true;
		try {
			const res = await fetch(`/api/group-events/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editState)
			});
			if (!res.ok) throw new Error();
			toastStore.success('Event updated');
			editingEventId = null;
			await invalidateAll();
		} catch {
			toastStore.error('Failed to update event');
		} finally {
			saving = false;
		}
	}

	// ── Delete event ────────────────────────────────────────────────
	async function deleteEvent(id: string) {
		if (!confirm('Delete this event?')) return;
		try {
			const res = await fetch(`/api/group-events/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error();
			toastStore.success('Event deleted');
			await invalidateAll();
		} catch {
			toastStore.error('Failed to delete event');
		}
	}

	// ── Attend / leave event ────────────────────────────────────────
	let attendingIds = $state<Set<string>>(new Set());
	let attendToggles = $state<Set<string>>(new Set());

	$effect(() => {
		attendingIds = new Set(data.events.filter((e) => e.iAmAttending).map((e) => e.id));
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
			await invalidateAll();
		} catch {
			if (was) attendingIds.add(id); else attendingIds.delete(id);
			attendingIds = new Set(attendingIds);
			toastStore.error('Failed to update attendance');
		} finally {
			attendToggles.delete(id);
			attendToggles = new Set(attendToggles);
		}
	}
</script>

<svelte:head>
	<title>Group Overview — {data.groupName} — RFP Squad</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- Header -->
	<div class="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
		<div class="mx-auto max-w-2xl">
			<a href="/" class="mb-3 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">← Schedule</a>
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-xl font-bold text-[var(--color-text)]">Group Overview</h1>
					<p class="text-sm text-[var(--color-muted)]">{data.groupName}</p>
				</div>
				<a href="/friends" class="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">Friends →</a>
			</div>
		</div>
	</div>

	<!-- Day tabs -->
	<div class="sticky top-[57px] z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
		<div class="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

	<div class="mx-auto w-full max-w-2xl px-4 py-4">

		<!-- Member filter chips (multi-select) -->
		{#if data.members.length > 1}
			<div class="mb-4 flex flex-wrap gap-2">
				<button
					type="button"
					class="rounded-full border px-3 py-1 text-xs transition-colors {filteredMemberIds.size === 0
						? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
						: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]'}"
					onclick={() => (filteredMemberIds = new Set())}
				>
					Everyone
				</button>
				{#each data.members as m (m.id)}
					{@const active = filteredMemberIds.has(m.id)}
					<button
						type="button"
						class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors {active
							? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]'
							: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]'}"
						onclick={() => toggleMemberFilter(m.id)}
					>
						<MemberChip name={m.name} size="sm" />
						{m.name}{m.id === data.currentMemberId ? ' (you)' : ''}
					</button>
				{/each}
				{#if filteredMemberIds.size > 0}
					<span class="flex items-center text-xs text-[var(--color-muted)]">
						— showing bands where at least one selected member goes
					</span>
				{/if}
			</div>
		{/if}

		<!-- ── Group Events ─────────────────────────────────────── -->
		<section class="mb-6">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">📅 Group Events</h2>
				<button
					type="button"
					class="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
					onclick={() => { showAddEvent = !showAddEvent; editingEventId = null; }}
				>
					{showAddEvent ? '✕ Cancel' : '+ Add event'}
				</button>
			</div>

			{#if showAddEvent}
				<div class="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
					<div class="flex flex-col gap-3">
						<input
							type="text"
							bind:value={newEvent.title}
							placeholder="Event name (e.g. Group lunch)"
							class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
						/>
						<div class="flex gap-2">
							<label class="flex-1">
								<span class="mb-1 block text-xs text-[var(--color-muted)]">Start time</span>
								<input type="time" bind:value={newEvent.timeStart} class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
							</label>
							<label class="flex-1">
								<span class="mb-1 block text-xs text-[var(--color-muted)]">End time (optional)</span>
								<input type="time" bind:value={newEvent.timeEnd} class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
							</label>
						</div>
						<input type="text" bind:value={newEvent.description} placeholder="Notes (optional)" class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
						<button type="button" disabled={addingEvent || !newEvent.title.trim() || !newEvent.timeStart} onclick={submitEvent}
							class="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-[var(--color-accent-hover)]">
							{addingEvent ? 'Adding…' : 'Add event'}
						</button>
					</div>
				</div>
			{/if}

			{#if data.events.length === 0 && !showAddEvent}
				<p class="py-2 text-sm text-[var(--color-muted)]">No events yet. Add a group lunch, meetup point, photo spot, etc.</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each data.events as ev (ev.id)}
						{@const iAm = attendingIds.has(ev.id)}
						{@const toggling = attendToggles.has(ev.id)}

						<div class="rounded-xl border border-blue-900/60 bg-blue-950/20 px-4 py-3">
							{#if editingEventId === ev.id}
								<!-- Edit form (inline) -->
								<div class="flex flex-col gap-2">
									<input type="text" bind:value={editState.title} placeholder="Event name" class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
									<div class="flex gap-2">
										<input type="time" bind:value={editState.timeStart} class="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
										<input type="time" bind:value={editState.timeEnd} class="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
									</div>
									<input type="text" bind:value={editState.description} placeholder="Notes (optional)" class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
									<div class="flex gap-2">
										<button type="button" onclick={() => saveEdit(ev.id)} disabled={saving}
											class="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
											{saving ? 'Saving…' : 'Save'}
										</button>
										<button type="button" onclick={() => (editingEventId = null)}
											class="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)]">
											Cancel
										</button>
									</div>
								</div>
							{:else}
								<!-- Normal view -->
								<div class="flex items-start gap-3">
									<div class="w-14 shrink-0 text-right">
										<p class="text-sm font-semibold tabular-nums text-blue-300">{ev.timeStart}</p>
										{#if ev.timeEnd}<p class="text-[11px] text-blue-400/70">{ev.timeEnd}</p>{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate font-semibold text-[var(--color-text)]">📅 {ev.title}</p>
										{#if ev.description}
											<p class="mt-0.5 truncate text-xs text-[var(--color-muted)]">{ev.description}</p>
										{/if}
										<!-- Attendees -->
										{#if ev.attendees.length > 0}
											<div class="mt-2 flex flex-wrap gap-1">
												{#each ev.attendees as att (att.id)}
													<span class="flex items-center gap-1 rounded-full bg-blue-900/40 px-2 py-0.5 text-[11px] text-blue-200">
														<MemberChip name={att.name} size="sm" />{att.name}
													</span>
												{/each}
											</div>
										{/if}
									</div>
									<!-- Actions -->
									<div class="flex shrink-0 flex-col items-end gap-1.5">
										<!-- Join / Leave -->
										{#if data.currentMemberId}
											<button
												type="button"
												disabled={toggling}
												onclick={() => toggleAttend(ev.id)}
												class="rounded-lg border px-2.5 py-1 text-xs font-medium transition-all disabled:opacity-50 {iAm
													? 'border-blue-600 bg-blue-900/50 text-blue-300 hover:border-red-600 hover:bg-red-900/30 hover:text-red-300'
													: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-blue-600 hover:bg-blue-900/30 hover:text-blue-300'}"
											>
												{iAm ? '✓ Joined' : '+ Join'}
											</button>
										{/if}
										<!-- Edit -->
										<button type="button" onclick={() => startEdit(ev)} class="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)]">
											Edit
										</button>
										<!-- Delete -->
										<button type="button" onclick={() => deleteEvent(ev.id)} class="text-[11px] text-[var(--color-muted)] hover:text-red-400">
											Delete
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- ── Band picks ────────────────────────────────────────── -->
		<section>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">🎸 Band picks</h2>
				{#if visibleBands.length > 0}
					<span class="text-xs text-[var(--color-muted)]">{visibleBands.length} bands</span>
				{/if}
			</div>

			{#if visibleBands.length === 0}
				<p class="py-6 text-center text-sm text-[var(--color-muted)]">
					{filteredMemberIds.size > 0 ? 'No picks for the selected members on this day.' : 'No picks yet for this day.'}
				</p>
			{:else}
				<div class="flex flex-col divide-y divide-[var(--color-border)]">
					{#each visibleBands as band (band.id)}
						{@const isPicked = myPickIds.has(band.id)}
						{@const isToggling = pickToggling.has(band.id)}
						<div class="flex items-start gap-3 py-3.5 {isToggling ? 'opacity-60' : ''}">
							<div class="w-14 shrink-0 text-right">
								<p class="text-sm font-semibold tabular-nums text-[var(--color-text)]">{band.timeStart}</p>
								<p class="text-[11px] text-[var(--color-muted)]">{band.timeEnd}</p>
							</div>
							<div
								class="mt-1 h-8 shrink-0 rounded-full"
								style="width: {Math.min(4 + band.pickers.length * 2, 10)}px; background: var(--color-accent); opacity: {0.3 + band.pickers.length * 0.12}"
							></div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold leading-tight {isPicked ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}">
									{band.band}
								</p>
								<p class="mb-2 truncate text-xs text-[var(--color-muted)]">{band.stage}</p>
								<div class="flex flex-wrap gap-1.5">
									{#each band.pickers as picker (picker.id)}
										{@const pickerActive = filteredMemberIds.has(picker.id)}
										<button
											type="button"
											class="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors {pickerActive
												? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
												: 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-muted)]'}"
											onclick={() => toggleMemberFilter(picker.id)}
										>
											<MemberChip name={picker.name} size="sm" />
											{picker.name}
										</button>
									{/each}
								</div>
							</div>
							<!-- Pick button -->
							{#if data.currentMemberId}
								<button
									type="button"
									onclick={() => togglePick(band.id, band.band)}
									disabled={isToggling}
									title={isPicked ? 'Remove pick' : 'Add to my picks'}
									class="mt-0.5 shrink-0 text-xl leading-none transition-colors disabled:opacity-50 {isPicked ? 'text-[var(--color-accent)]' : 'text-[var(--color-border)] hover:text-[var(--color-muted)]'}"
								>
									{isPicked ? '★' : '☆'}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
