<script lang="ts">
	import { getMemberColor, getMemberInitials } from '$lib/memberColor';

	let {
		name,
		memberId = undefined,
		customColor = undefined,
		size = 'md',
		showName = false,
		avatarUrl = undefined
	}: {
		name: string;
		memberId?: string;
		customColor?: string | null;
		size?: 'sm' | 'md' | 'lg';
		showName?: boolean;
		avatarUrl?: string;
	} = $props();

	// If memberId provided, use it for color; otherwise fall back to name (legacy behavior)
	const bgColor = $derived(getMemberColor(memberId || name, customColor));
	const initials = $derived(getMemberInitials(name));

	const sizeClass = $derived.by(() => {
		switch (size) {
			case 'sm':
				return 'size-6 text-[10px]';
			case 'lg':
				return 'size-12 text-base';
			default:
				return 'size-8 text-sm';
		}
	});
</script>

<span class="inline-flex items-center gap-2">
	{#if avatarUrl}
		<img
			src={avatarUrl}
			alt={name}
			title={name}
			class="shrink-0 rounded-full object-cover {sizeClass}"
		/>
	{:else}
		<span
			class="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white {sizeClass}"
			style:background-color={bgColor}
			title={name}
		>
			{initials || '?'}
		</span>
	{/if}
	{#if showName}
		<span class="truncate text-[var(--color-text)]">{name}</span>
	{/if}
</span>
