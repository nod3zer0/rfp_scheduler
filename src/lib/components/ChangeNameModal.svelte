<script lang="ts">
	import Modal from './Modal.svelte';
	import MemberChip from './MemberChip.svelte';

	let {
		open,
		onclose,
		groupId,
		currentMemberId,
		currentUserId
	}: {
		open: boolean;
		onclose: () => void;
		groupId: string;
		currentMemberId?: string;
		currentUserId?: string;
	} = $props();

	type MemberItem = { id: string; name: string; isRegistered: boolean };
	let memberList = $state<MemberItem[]>([]);
	let loading = $state(false);
	let fetchError = $state<string | null>(null);
	let nameInput = $state('');
	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	$effect(() => {
		if (!open) return;

		let cancelled = false;
		loading = true;
		fetchError = null;
		memberList = [];

		fetch(`/api/group-members?groupId=${encodeURIComponent(groupId)}`)
			.then((res) => {
				if (!res.ok) throw new Error('Failed to load members');
				return res.json() as Promise<{ members: MemberItem[] }>;
			})
			.then((data) => {
				if (!cancelled) memberList = data.members ?? [];
			})
			.catch(() => {
				if (!cancelled) fetchError = 'Could not load members.';
			})
			.finally(() => {
				if (!cancelled) loading = false;
			});

		return () => { cancelled = true; };
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const name = nameInput.trim();
		if (!name || submitting) return;

		submitting = true;
		submitError = null;
		try {
			const res = await fetch('/api/identity', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, groupId })
			});

			if (res.status === 403) {
				const body = await res.json() as { message?: string };
				submitError = body.message ?? 'That name is protected. Sign in to use it.';
				return;
			}
			if (!res.ok) throw new Error('Request failed');

			const data = (await res.json()) as { memberId: string; groupId: string };
			const payload = JSON.stringify({ memberId: data.memberId, groupId: data.groupId });
			document.cookie = `rfp_identity=${encodeURIComponent(payload)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;

			onclose();
			window.location.reload();
		} catch {
			submitError = 'Something went wrong. Try again.';
		} finally {
			submitting = false;
		}
	}

	function canPick(m: MemberItem): boolean {
		if (!m.isRegistered) return true;
		// Registered member can only be picked if YOU are that user
		return !!currentUserId;
	}

	function pickMember(m: MemberItem) {
		if (!canPick(m)) return;
		nameInput = m.name;
	}
</script>

<Modal open={open} title="Your identity" onclose={onclose}>
	{#snippet children()}
		{#if loading}
			<p class="text-sm text-[var(--color-muted)]">Loading members…</p>
		{:else if fetchError}
			<p class="text-sm text-red-400">{fetchError}</p>
		{:else}
			{#if memberList.length > 0}
				<p class="mb-2 text-xs text-[var(--color-muted)]">Pick an existing member or type a new name.</p>
				<div class="mb-4 flex flex-wrap gap-2">
					{#each memberList as m (m.id)}
						{@const locked = m.isRegistered && !canPick(m)}
						<button
							type="button"
							disabled={locked}
							title={locked ? `${m.name} is password-protected` : m.name}
							class="rounded-lg border transition-colors {m.id === currentMemberId
								? 'border-[var(--color-accent)] bg-[var(--color-surface-2)] ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-surface)]'
								: locked
									? 'cursor-not-allowed border-[var(--color-border)] opacity-40'
									: 'border-[var(--color-border)] hover:border-[var(--color-muted)] hover:bg-[var(--color-surface-2)]'}"
							onclick={() => pickMember(m)}
						>
							<span class="flex items-center gap-1 px-2 py-1">
								<MemberChip name={m.name} size="sm" showName />
								{#if m.isRegistered}
									<span class="text-[10px] text-[var(--color-muted)]">🔒</span>
								{/if}
							</span>
						</button>
					{/each}
				</div>
			{/if}

			{#if submitError}
				<div class="mb-3 rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
					{submitError}
					<a href="/account/login" class="ml-1 underline">Sign in →</a>
				</div>
			{/if}

			<form class="flex flex-col gap-3" onsubmit={handleSubmit}>
				<label class="block">
					<span class="mb-1 block text-xs text-[var(--color-muted)]">Display name</span>
					<input
						type="text"
						bind:value={nameInput}
						class="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
						placeholder="Your name"
						autocomplete="name"
					/>
				</label>
				<button
					type="submit"
					disabled={submitting || !nameInput.trim()}
					class="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Saving…' : 'Save'}
				</button>
			</form>

			<div class="mt-4 border-t border-[var(--color-border)] pt-4">
				{#if currentUserId}
					<form method="POST" action="/account/logout">
						<button type="submit" class="text-sm text-[var(--color-muted)] hover:text-red-400">
							Sign out
						</button>
					</form>
				{:else}
					<p class="text-xs text-[var(--color-muted)]">
						Want to protect your name?
						<a href="/account/register" class="text-[var(--color-accent)] hover:underline">Register</a>
						or
						<a href="/account/login" class="text-[var(--color-accent)] hover:underline">Sign in</a>
					</p>
				{/if}
			</div>
		{/if}
	{/snippet}
</Modal>
