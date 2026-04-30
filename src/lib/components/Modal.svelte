<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		title,
		onclose,
		children
	}: {
		open: boolean;
		title?: string;
		onclose: () => void;
		children: Snippet;
	} = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
	>
		<div
			class="relative max-h-[90vh] w-full max-w-md overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'modal-title' : undefined}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				type="button"
				class="absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-xl leading-none text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
				onclick={() => onclose()}
				aria-label="Close"
			>
				×
			</button>
			{#if title}
				<h2 id="modal-title" class="border-b border-[var(--color-border)] px-5 pb-3 pt-4 pr-12 text-lg font-semibold text-[var(--color-text)]">
					{title}
				</h2>
			{/if}
			<div class={title ? 'p-5' : 'p-5 pt-12'}>
				{@render children()}
			</div>
		</div>
	</div>
{/if}
