// Festival map configuration and GPS conversion utilities
// Park 360, Hradec Králové (Rock for People venue)

export type MapType = 'venue' | 'sanitation' | 'parking';

export const MAP_TYPES: Record<MapType, { label: string; imageUrl: string; pdfUrl: string }> = {
	venue: {
		label: 'Festival Venue',
		imageUrl: 'https://rockforpeople.cz/wp-content/uploads/2026/05/A2-Public-2026_Final-2_page-0001-1-scaled.jpg',
		pdfUrl: 'https://rockforpeople.cz/wp-content/uploads/2026/05/A2-Public-2026_Final-2-1.pdf'
	},
	sanitation: {
		label: 'Sanitation',
		imageUrl: 'https://rockforpeople.cz/wp-content/uploads/2026/05/Mapa-Sanita_page-0001-scaled.jpg',
		pdfUrl: 'https://rockforpeople.cz/wp-content/uploads/2026/05/Mapa-Sanita.pdf'
	},
	parking: {
		label: 'Entrances & Parking',
		imageUrl: 'https://rockforpeople.cz/wp-content/uploads/2026/05/Najezdy-Public-2026_FINAL-2_page-0001-scaled.jpg',
		pdfUrl: 'https://rockforpeople.cz/wp-content/uploads/2026/05/Najezdy-Public-2026_FINAL-2.pdf'
	}
};

// Geographic bounds for Park 360, Hradec Králové
// These are approximate bounds - calibrate with known landmarks for better accuracy
const MAP_BOUNDS = {
	venue: {
		topLeft: { lat: 50.253503322010786, lng: 15.83249205507738 },
		bottomRight: { lat: 50.2418575302451, lng: 15.84548222261705 }
	},
	sanitation: {
		topLeft: { lat: 50.253503322010786, lng: 15.83249205507738 },
		bottomRight: { lat: 50.2418575302451, lng: 15.84548222261705 }
	},
	parking: {
		topLeft: { lat: 50.253503322010786, lng: 15.83249205507738 },
		bottomRight: { lat: 50.2418575302451, lng: 15.84548222261705 }
	}
};

/**
 * Convert GPS coordinates to image position (0-100% x/y)
 */
export function gpsToImageCoords(
	lat: number,
	lng: number,
	mapType: MapType
): { x: number; y: number } {
	const bounds = MAP_BOUNDS[mapType];

	const xPercent =
		((lng - bounds.topLeft.lng) / (bounds.bottomRight.lng - bounds.topLeft.lng)) * 100;
	const yPercent =
		((bounds.topLeft.lat - lat) / (bounds.topLeft.lat - bounds.bottomRight.lat)) * 100;

	// Clamp to 0-100 range
	return {
		x: Math.max(0, Math.min(100, Math.round(xPercent))),
		y: Math.max(0, Math.min(100, Math.round(yPercent)))
	};
}

/**
 * Convert image position (0-100% x/y) to GPS coordinates
 */
export function imageCoordsToGPS(
	x: number,
	y: number,
	mapType: MapType
): { lat: number; lng: number } {
	const bounds = MAP_BOUNDS[mapType];

	const lng = bounds.topLeft.lng + (x / 100) * (bounds.bottomRight.lng - bounds.topLeft.lng);
	const lat = bounds.topLeft.lat - (y / 100) * (bounds.topLeft.lat - bounds.bottomRight.lat);

	return { lat, lng };
}

/**
 * Calculate distance between two GPS coordinates in meters
 */
export function calculateDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const R = 6371e3; // Earth radius in meters
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lng2 - lng1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return Math.round(R * c); // Distance in meters
}

/**
 * Calculate bearing (direction) between two GPS coordinates
 * Returns cardinal direction: N, NE, E, SE, S, SW, W, NW
 */
export function calculateBearing(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): string {
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δλ = ((lng2 - lng1) * Math.PI) / 180;

	const y = Math.sin(Δλ) * Math.cos(φ2);
	const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
	const θ = Math.atan2(y, x);
	const bearing = ((θ * 180) / Math.PI + 360) % 360;

	const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
	const index = Math.round(bearing / 45) % 8;
	return directions[index];
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
	if (meters < 1000) return `${meters}m`;
	return `${(meters / 1000).toFixed(1)}km`;
}
