<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { toastStore } from '$lib/toast.svelte';
	import { MAP_TYPES, calculateDistance, calculateBearing, formatDistance, gpsToImageCoords } from '$lib/mapConfig';
	import { getMemberColor } from '$lib/memberColor';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currentMember = $derived($page.data.member);
	const memberColor = $derived(currentMember ? getMemberColor(currentMember.id, currentMember.customColor) : '#8b5cf6');

	// Pin placement state
	let showModal = $state(false);
	let modalX = $state(0);
	let modalY = $state(0);
	let label = $state('');
	let note = $state('');
	let selectedIcon = $state('📍');
	let expiresInHours = $state<number | null>(null);

	// GPS state
	let gettingLocation = $state(false);
	let userLocation = $state<{ lat: number; lng: number } | null>(null);
	let showUserLocation = $state(false);
	let deletingPin = $state<string | null>(null);

	// Filter state
	let filterMember = $state<string | null>(null);
	let searchQuery = $state('');
	let highlightedPin = $state<string | null>(null);

	// Map controls state
	let zoom = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);
	let isMapPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);
	let panStartTranslateX = $state(0);
	let panStartTranslateY = $state(0);

	const mapInfo = MAP_TYPES.venue;
	const ICON_OPTIONS = ['📍', '🎸', '🍔', '🍺', '🚻', '⭐', '❤️', '💡', '⚠️', '✅', '🏕️', '🎭', '🎪', '🎨'];

	const filteredPins = $derived(
		data.pins.filter((pin) => {
			if (filterMember && pin.memberId !== filterMember) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				return (
					pin.label.toLowerCase().includes(q) ||
					pin.note?.toLowerCase().includes(q) ||
					pin.memberName.toLowerCase().includes(q)
				);
			}
			return true;
		})
	);

	const userLocationCoords = $derived(() => {
		if (!userLocation) return null;
		const coords = gpsToImageCoords(userLocation.lat, userLocation.lng, 'venue');
		return coords;
	});

	let hasMapMoved = $state(false);

	function handleMapClick(e: MouseEvent) {
		// Don't place pin if we just finished panning
		if (hasMapMoved) return;

		const img = e.currentTarget as HTMLElement;
		const rect = img.getBoundingClientRect();

		// Click position relative to the image's bounding rect (already transformed)
		const clickX = e.clientX - rect.left;
		const clickY = e.clientY - rect.top;

		// The rect is already transformed, so rect.width = original_width * zoom
		// Just convert click position to percentage
		const x = (clickX / rect.width) * 100;
		const y = (clickY / rect.height) * 100;

		modalX = Math.max(0, Math.min(100, x));
		modalY = Math.max(0, Math.min(100, y));
		label = '';
		note = '';
		selectedIcon = '📍';
		expiresInHours = null;
		showModal = true;
	}

	function handleMapMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;

		isMapPanning = true;
		hasMapMoved = false;
		panStartX = e.clientX;
		panStartY = e.clientY;
		panStartTranslateX = translateX;
		panStartTranslateY = translateY;
	}

	function handleMapMouseMove(e: MouseEvent) {
		if (!isMapPanning) return;

		const deltaX = e.clientX - panStartX;
		const deltaY = e.clientY - panStartY;

		// Consider it a drag if moved more than 5 pixels
		if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
			hasMapMoved = true;
		}

		translateX = panStartTranslateX + deltaX;
		translateY = panStartTranslateY + deltaY;
	}

	function handleMapMouseUp(e: MouseEvent) {
		if (isMapPanning) {
			e.stopPropagation();
			isMapPanning = false;
			// Reset hasMapMoved after a short delay to allow click handler to check it
			setTimeout(() => { hasMapMoved = false; }, 100);
		}
	}

	function handleGlobalMouseUp() {
		// Catch-all to ensure panning stops even if event doesn't reach our handler
		isMapPanning = false;
	}

	// Touch event handlers
	let touchStartDistance = $state<number | null>(null);
	let touchStartZoom = $state(1);

	function handleTouchStart(e: TouchEvent) {
		e.preventDefault(); // Always prevent default to stop page zoom/scroll

		if (e.touches.length === 1) {
			// Single touch - pan
			isMapPanning = true;
			hasMapMoved = false;
			panStartX = e.touches[0].clientX;
			panStartY = e.touches[0].clientY;
			panStartTranslateX = translateX;
			panStartTranslateY = translateY;
		} else if (e.touches.length === 2) {
			// Two finger - pinch zoom
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			touchStartDistance = Math.sqrt(dx * dx + dy * dy);
			touchStartZoom = zoom;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length === 1 && isMapPanning) {
			e.preventDefault(); // Prevent page scroll
			const deltaX = e.touches[0].clientX - panStartX;
			const deltaY = e.touches[0].clientY - panStartY;

			if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
				hasMapMoved = true;
			}

			translateX = panStartTranslateX + deltaX;
			translateY = panStartTranslateY + deltaY;
		} else if (e.touches.length === 2 && touchStartDistance) {
			e.preventDefault(); // Prevent page zoom
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const distance = Math.sqrt(dx * dx + dy * dy);
			const scale = distance / touchStartDistance;
			zoom = Math.max(1, Math.min(4, touchStartZoom * scale));
		}
	}

	function handleTouchEnd() {
		if (isMapPanning) {
			isMapPanning = false;
			setTimeout(() => { hasMapMoved = false; }, 100);
		}
		touchStartDistance = null;
	}

	function handlePinClick(e: MouseEvent, pinId: string) {
		e.stopPropagation();
		highlightedPin = highlightedPin === pinId ? null : pinId;
	}

	function zoomIn() {
		zoom = Math.min(zoom * 1.3, 4);
	}

	function zoomOut() {
		zoom = Math.max(zoom / 1.3, 1);
	}

	function resetView() {
		zoom = 1;
		translateX = 0;
		translateY = 0;
	}

	async function toggleUserLocation() {
		if (showUserLocation) {
			showUserLocation = false;
			userLocation = null;
			return;
		}

		if (!navigator.geolocation) {
			toastStore.error('Geolocation not supported');
			return;
		}

		gettingLocation = true;
		try {
			const position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				});
			});

			userLocation = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};
			showUserLocation = true;

			toastStore.success('Location shown on map');
		} catch (err: any) {
			if (err?.code === 1) {
				toastStore.error('Location permission denied');
			} else if (err?.code === 2) {
				toastStore.error('Location unavailable');
			} else if (err?.code === 3) {
				toastStore.error('Location timeout - try again');
			} else {
				toastStore.error('Could not get location - check permissions');
			}
			console.error('Geolocation error:', err);
		} finally {
			gettingLocation = false;
		}
	}

	async function placeManualPin() {
		if (!label.trim()) {
			toastStore.error('Label is required');
			return;
		}

		try {
			const res = await fetch('/api/map-pins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					x: modalX,
					y: modalY,
					label: label.trim(),
					note: note.trim() || null,
					icon: selectedIcon,
					expiresInHours
				})
			});

			if (!res.ok) throw new Error();

			toastStore.success('Pin placed');
			showModal = false;
			await invalidateAll();
		} catch {
			toastStore.error('Failed to place pin');
		}
	}

	async function deletePin(pinId: string) {
		if (!confirm('Delete this pin?')) return;

		deletingPin = pinId;
		try {
			const res = await fetch('/api/map-pins', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pinId })
			});

			if (!res.ok) throw new Error();

			toastStore.success('Pin deleted');
			await invalidateAll();
		} catch {
			toastStore.error('Failed to delete pin');
		} finally {
			deletingPin = null;
		}
	}

	function getPinDistance(pin: (typeof data.pins)[0]) {
		if (!userLocation || !pin.latitude || !pin.longitude) return null;
		const distance = calculateDistance(userLocation.lat, userLocation.lng, pin.latitude, pin.longitude);
		const bearing = calculateBearing(userLocation.lat, userLocation.lng, pin.latitude, pin.longitude);
		return { distance, bearing };
	}
</script>

<svelte:head>
	<title>Festival Map — RFP Squad</title>
	<style>
		body {
			overscroll-behavior: none;
		}
	</style>
</svelte:head>

<svelte:window
	onmousemove={handleMapMouseMove}
	onmouseup={handleGlobalMouseUp}
/>

<div class="mx-auto max-w-6xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-2xl font-bold text-[var(--color-text)]">Festival Map</h1>
	</div>

	<!-- Filters -->
	<div class="mb-4 flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row">
		<div class="flex-1">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search pins..."
				class="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
			/>
		</div>
		<div>
			<select
				bind:value={filterMember}
				class="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] sm:w-auto"
			>
				<option value={null}>All members</option>
				{#each data.members as member (member.id)}
					<option value={member.id}>{member.name}</option>
				{/each}
			</select>
		</div>
		{#if filterMember || searchQuery}
			<button
				type="button"
				class="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
				onclick={() => { filterMember = null; searchQuery = ''; }}
			>
				Clear filters
			</button>
		{/if}
	</div>

	<!-- Map Container -->
	<div class="relative mb-6 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
		<!-- Map Controls -->
		<div class="absolute right-4 top-4 z-30 flex flex-col gap-2">
			<button
				type="button"
				class="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] shadow-lg transition-colors"
				class:bg-blue-600={showUserLocation}
				class:text-white={showUserLocation}
				class:bg-[var(--color-bg)]={!showUserLocation}
				class:text-[var(--color-text)]={!showUserLocation}
				onclick={toggleUserLocation}
				disabled={gettingLocation}
				title="Show my location"
			>
				{#if gettingLocation}
					<span class="text-xs">...</span>
				{:else}
					<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="3"/>
						<circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
					</svg>
				{/if}
			</button>
			<button
				type="button"
				class="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-lg font-bold text-[var(--color-text)] shadow-lg hover:bg-[var(--color-surface)]"
				onclick={zoomIn}
				title="Zoom in"
			>
				+
			</button>
			<button
				type="button"
				class="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-lg font-bold text-[var(--color-text)] shadow-lg hover:bg-[var(--color-surface)]"
				onclick={zoomOut}
				title="Zoom out"
			>
				−
			</button>
			<button
				type="button"
				class="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-medium text-[var(--color-text)] shadow-lg hover:bg-[var(--color-surface)]"
				onclick={resetView}
				title="Reset view"
			>
				⟲
			</button>
		</div>

		<div
			class="map-container relative touch-none"
			class:cursor-grab={!isMapPanning}
			class:cursor-grabbing={isMapPanning}
			style="touch-action: none;"
			onmousedown={handleMapMouseDown}
			onmouseup={handleMapMouseUp}
			ontouchstart={handleTouchStart}
			ontouchmove={handleTouchMove}
			ontouchend={handleTouchEnd}
		>
			<div
				style="transform: scale({zoom}) translate({translateX / zoom}px, {translateY / zoom}px); transform-origin: 0 0;"
				class="transition-transform duration-100"
			>
				<img
					src={mapInfo.imageUrl}
					alt={mapInfo.label}
					class="w-full select-none"
					onclick={handleMapClick}
					draggable="false"
				/>

				<!-- User Location Blue Dot -->
				{#if showUserLocation && userLocationCoords()}
					{@const coords = userLocationCoords()}
					{#if coords}
						<div
							class="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
							style="left: {coords.x}%; top: {coords.y}%;"
						>
							<!-- Pulsing ring -->
							<div class="absolute inset-0 -m-4 animate-ping">
								<div class="h-8 w-8 rounded-full bg-blue-500 opacity-75"></div>
							</div>
							<!-- Blue dot -->
							<div class="relative flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 border-2 border-white shadow-lg">
								<div class="h-2 w-2 rounded-full bg-white"></div>
							</div>
						</div>
					{/if}
				{/if}

				<!-- Pins Overlay -->
				{#each filteredPins as pin (pin.id)}
					{@const pinColor = getMemberColor(pin.memberId, pin.memberCustomColor)}
					{@const pinScale = (1 / zoom) * (highlightedPin === pin.id ? 1.1 : 1)}
					{@const tooltipLeft = 10 / pinScale}
					<div
						class="group absolute cursor-pointer"
						style="left: {pin.x}%; top: {pin.y}%; transform: translate(-50%, -100%) scale({pinScale}); transform-origin: center bottom;"
					>
						<button
							type="button"
							data-pin-id={pin.id}
							class="relative transition-all"
							class:z-10={highlightedPin === pin.id}
							class:ring-4={highlightedPin === pin.id}
							class:ring-yellow-400={highlightedPin === pin.id}
							class:opacity-40={highlightedPin && highlightedPin !== pin.id}
							onclick={(e) => handlePinClick(e, pin.id)}
						>
							<!-- Pin marker -->
							<div class="relative pointer-events-none">
								<svg width="40" height="50" viewBox="0 0 40 50" class="drop-shadow-lg">
									<path
										d="M20 0C9 0 0 9 0 20c0 11 20 30 20 30s20-19 20-30c0-11-9-20-20-20z"
										fill={pinColor}
										stroke="white"
										stroke-width="2"
									/>
								</svg>
								<div class="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 text-2xl">
									{pin.icon}
								</div>
							</div>
						</button>

						<!-- Tooltip -->
						<div
							class="absolute top-0 z-20 w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left text-xs shadow-xl group-hover:block"
							class:hidden={highlightedPin !== pin.id}
							class:block={highlightedPin === pin.id}
							style="left: {tooltipLeft}px; transform: scale({1 / pinScale}); transform-origin: left center;"
						>
							<div class="mb-1 flex items-start justify-between gap-2">
								<div class="flex-1">
									<div class="font-medium text-[var(--color-text)]">{pin.label}</div>
									<div class="text-[var(--color-muted)]">{pin.memberName}</div>
								</div>
								<div class="text-2xl">{pin.icon}</div>
							</div>
							{#if pin.note}
								<div class="mt-2 text-[var(--color-text)]">{pin.note}</div>
							{/if}
							{#if pin.latitude && pin.longitude && userLocation}
								{@const distanceInfo = getPinDistance(pin)}
								{#if distanceInfo}
									<div class="mt-2 font-mono text-[var(--color-accent)]">
										{formatDistance(distanceInfo.distance)} {distanceInfo.bearing}
									</div>
								{/if}
							{/if}
							<div class="mt-2 text-[var(--color-muted)]">
								{new Date(pin.createdAt).toLocaleString()}
							</div>
							{#if currentMember?.id === pin.memberId || data.isGroupOwner}
								<button
									type="button"
									class="mt-2 text-red-400 hover:text-red-300"
									onclick={(e) => { e.stopPropagation(); deletePin(pin.id); }}
									disabled={deletingPin === pin.id}
								>
									{deletingPin === pin.id ? 'Deleting…' : 'Delete'}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="p-3 text-right">
			<a
				href={mapInfo.pdfUrl}
				target="_blank"
				class="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
			>
				Download PDF
			</a>
		</div>
	</div>

	<!-- Pin List -->
	{#if filteredPins.length > 0}
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
			<h2 class="mb-3 text-lg font-semibold text-[var(--color-text)]">
				Pins ({filteredPins.length})
			</h2>
			<div class="space-y-2">
				{#each filteredPins as pin (pin.id)}
					{@const pinColor = getMemberColor(pin.memberId, pin.memberCustomColor)}
					<button
						type="button"
						class="group flex w-full items-start gap-3 rounded border border-[var(--color-border)] p-3 text-left transition-colors hover:bg-[var(--color-surface-2)]"
						class:ring-2={highlightedPin === pin.id}
						class:ring-[var(--color-accent)]={highlightedPin === pin.id}
						onclick={() => highlightedPin = highlightedPin === pin.id ? null : pin.id}
					>
						<div
							class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl"
							style="background-color: {pinColor};"
						>
							{pin.icon}
						</div>
						<div class="flex-1">
							<div class="font-medium text-[var(--color-text)]">{pin.label}</div>
							<div class="text-sm text-[var(--color-muted)]">{pin.memberName}</div>
							{#if pin.note}
								<div class="mt-1 text-sm text-[var(--color-text)]">{pin.note}</div>
							{/if}
							{#if pin.latitude && pin.longitude && userLocation}
								{@const distanceInfo = getPinDistance(pin)}
								{#if distanceInfo}
									<div class="mt-1 text-sm font-mono text-[var(--color-accent)]">
										{formatDistance(distanceInfo.distance)} {distanceInfo.bearing}
									</div>
								{/if}
							{/if}
							<div class="mt-1 text-xs text-[var(--color-muted)]">
								{new Date(pin.createdAt).toLocaleString()}
								{#if pin.expiresAt}
									· Expires {new Date(pin.expiresAt).toLocaleTimeString()}
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
			{#if searchQuery || filterMember}
				No pins match your filters
			{:else}
				No pins yet. Click on the map to add one!
			{/if}
		</div>
	{/if}
</div>

<!-- Manual Pin Placement Modal -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showModal = false)}>
		<div class="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-6" onclick={(e) => e.stopPropagation()}>
			<h2 class="mb-4 text-xl font-bold text-[var(--color-text)]">Place Pin</h2>

			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium text-[var(--color-text)]">Label</label>
					<input
						type="text"
						bind:value={label}
						placeholder="e.g., Good food here, Meet here at 8pm"
						class="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-[var(--color-text)]">Icon</label>
					<div class="grid grid-cols-7 gap-2">
						{#each ICON_OPTIONS as icon}
							<button
								type="button"
								class="flex h-10 w-10 items-center justify-center rounded border-2 text-xl transition-colors"
								class:border-[var(--color-accent)]={selectedIcon === icon}
								class:border-[var(--color-border)]={selectedIcon !== icon}
								onclick={() => selectedIcon = icon}
							>
								{icon}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-[var(--color-text)]">Color</label>
					<div class="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
						<div class="h-6 w-6 rounded-full" style="background-color: {memberColor};"></div>
						<span class="text-sm text-[var(--color-text)]">Your color (automatic)</span>
					</div>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-[var(--color-text)]">Note (optional)</label>
					<textarea
						bind:value={note}
						placeholder="Additional details..."
						rows="3"
						class="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
					></textarea>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-[var(--color-text)]">Expires in</label>
					<select
						bind:value={expiresInHours}
						class="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
					>
						<option value={null}>Never (permanent)</option>
						<option value={1}>1 hour</option>
						<option value={4}>4 hours</option>
						<option value={12}>12 hours</option>
						<option value={24}>24 hours</option>
					</select>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)]"
						onclick={() => (showModal = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
						onclick={placeManualPin}
					>
						Place Pin
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
