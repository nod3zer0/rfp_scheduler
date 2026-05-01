<script lang="ts">
	type PickItem = {
		id: string;
		band: string;
		stage: string;
		timeStart: string;
		timeEnd: string;
		date: string;
		day: string;
	};

	type EventItem = {
		id: string;
		title: string;
		timeStart: string;
		timeEnd: string | null;
		day: string;
	};

	type GroupMember = { id: string; name: string };

	import MemberChip from '$lib/components/MemberChip.svelte';
	import { timeToMinutes, nowMinutes, formatCountdown } from '$lib/time.js';

	let {
		picks = [],
		events = [],
		picksMap = {},
		groupMembers = [],
		currentMemberId = null
	}: {
		picks?: PickItem[];
		events?: EventItem[];
		picksMap?: Record<string, GroupMember[]>;
		groupMembers?: GroupMember[];
		currentMemberId?: string | null;
	} = $props();

	type Status = 'now' | 'soon' | 'upcoming';
	type Card = {
		id: string;
		title: string;
		sub: string;
		timeStart: string;
		kind: 'pick' | 'event';
		status: Status;
		minutesAway: number;
		friends: GroupMember[];
	};

	let now = $state(nowMinutes());

	let cards = $derived<Card[]>(
		[
			...picks.map((p): Card => {
				const start = timeToMinutes(p.timeStart);
				const end = timeToMinutes(p.timeEnd);
				const away = start - now;
				const allPickers = picksMap[p.id] ?? [];
				const friends = allPickers.filter((m) => m.id !== currentMemberId);
				return {
					id: p.id,
					title: p.band,
					sub: `${p.timeStart} · ${p.stage}`,
					timeStart: p.timeStart,
					kind: 'pick',
					status: now >= start && now <= end ? 'now' : away > 0 && away <= 90 ? 'soon' : 'upcoming',
					minutesAway: away,
					friends
				};
			}),
			...events.map((e): Card => {
				const start = timeToMinutes(e.timeStart);
				const end = e.timeEnd ? timeToMinutes(e.timeEnd) : start + 60;
				const away = start - now;
				return {
					id: `ev-${e.id}`,
					title: e.title,
					sub: e.timeEnd ? `${e.timeStart}–${e.timeEnd}` : e.timeStart,
					timeStart: e.timeStart,
					kind: 'event',
					status: now >= start && now <= end ? 'now' : away > 0 && away <= 90 ? 'soon' : 'upcoming',
					minutesAway: away,
					friends: []
				};
			})
		]
			.filter((c) => {
				const end =
					c.kind === 'pick'
						? timeToMinutes((picks.find((p) => p.id === c.id)?.timeEnd) ?? c.timeStart)
						: c.kind === 'event'
							? (events.find((e) => `ev-${e.id}` === c.id)?.timeEnd
									? timeToMinutes(events.find((e) => `ev-${e.id}` === c.id)!.timeEnd!)
									: timeToMinutes(c.timeStart) + 60)
							: timeToMinutes(c.timeStart) + 60;
				return end > now;
			})
			.sort((a, b) => timeToMinutes(a.timeStart) - timeToMinutes(b.timeStart))
	);

	$effect(() => {
		const t = setInterval(() => (now = nowMinutes()), 30_000);
		return () => clearInterval(t);
	});
</script>

{#if cards.length > 0}
	<div class="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
		<div class="flex items-center justify-between px-4 pt-2.5 pb-1">
			<span class="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Today</span>
			<a href="/overview" class="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-text)]">Group overview →</a>
		</div>
		<div class="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			{#each cards as card (card.id)}
				<div
					class="flex shrink-0 flex-col gap-0.5 rounded-xl border px-3 py-2.5 {card.kind === 'event'
						? card.status === 'now'
							? 'border-blue-600 bg-blue-950/40'
							: 'border-blue-900/60 bg-blue-950/20'
						: card.status === 'now'
							? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
							: card.status === 'soon'
								? 'border-yellow-700/60 bg-yellow-950/30'
								: 'border-[var(--color-border)] bg-[var(--color-bg)]'}"
					style="min-width: 150px; max-width: 200px"
				>
					{#if card.status === 'now'}
						<span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider {card.kind === 'event' ? 'text-blue-400' : 'text-[var(--color-accent)]'}">
							<span class="inline-block size-1.5 animate-pulse rounded-full {card.kind === 'event' ? 'bg-blue-400' : 'bg-[var(--color-accent)]'}"></span>
							{card.kind === 'event' ? 'Happening now' : 'Now playing'}
						</span>
					{:else}
						<span class="text-[10px] font-medium uppercase tracking-wide {card.status === 'soon' ? 'text-yellow-400' : 'text-[var(--color-muted)]'}">
							{formatCountdown(card.minutesAway)}
						</span>
					{/if}
					<p class="truncate text-sm font-semibold leading-tight text-[var(--color-text)]">
						{#if card.kind === 'event'}<span class="mr-1">📅</span>{/if}{card.title}
					</p>
					<p class="truncate text-[11px] text-[var(--color-muted)]">{card.sub}</p>
					{#if card.friends.length > 0}
						<div class="mt-1 flex items-center gap-0.5">
							{#each card.friends.slice(0, 5) as friend (friend.id)}
								<MemberChip name={friend.name} size="sm" />
							{/each}
							{#if card.friends.length > 5}
								<span class="text-[10px] text-[var(--color-muted)]">+{card.friends.length - 5}</span>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
