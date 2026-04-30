<script lang="ts">
	import { toastStore } from '$lib/toast.svelte';

	const items = $derived(toastStore.toasts);

	function typeClasses(type: 'success' | 'error' | 'info') {
		switch (type) {
			case 'success':
				return 'bg-green-700 text-white';
			case 'error':
				return 'bg-red-700 text-white';
			default:
				return 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]';
		}
	}
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
	{#each items as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-start gap-2 rounded-lg px-4 py-3 shadow-lg {typeClasses(
				toast.type
			)}"
			role="status"
		>
			<p class="min-w-0 flex-1 text-sm">{toast.message}</p>
			<button
				type="button"
				class="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100"
				onclick={() => toastStore.remove(toast.id)}
				aria-label="Dismiss notification"
			>
				×
			</button>
		</div>
	{/each}
</div>
