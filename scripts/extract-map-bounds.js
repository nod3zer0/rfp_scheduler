#!/usr/bin/env node

/**
 * Extract geographic bounds from a GeoTIFF file
 *
 * Usage:
 *   node scripts/extract-map-bounds.js path/to/map.tif
 *
 * Downloads from mapwarper.net:
 *   https://mapwarper.net/maps/107468 -> Export -> GeoTiff
 */

import { fromFile } from 'geotiff';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function extractBounds(geotiffPath) {
	console.log(`Reading GeoTIFF: ${geotiffPath}`);

	const tiff = await fromFile(geotiffPath);
	const image = await tiff.getImage();

	// Get image dimensions
	const width = image.getWidth();
	const height = image.getHeight();

	console.log(`Image size: ${width}x${height} pixels`);

	// Get geospatial metadata
	const bbox = image.getBoundingBox();
	const [minX, minY, maxX, maxY] = bbox;

	console.log('\nGeographic Bounds:');
	console.log(`  West (min longitude):  ${minX}`);
	console.log(`  South (min latitude):  ${minY}`);
	console.log(`  East (max longitude):  ${maxX}`);
	console.log(`  North (max latitude):  ${maxY}`);

	// For our coordinate system:
	// topLeft = northwest corner = (maxY, minX)
	// bottomRight = southeast corner = (minY, maxX)
	const bounds = {
		venue: {
			topLeft: { lat: maxY, lng: minX },
			bottomRight: { lat: minY, lng: maxX }
		}
	};

	console.log('\nBounds for mapConfig.ts:');
	console.log(JSON.stringify(bounds, null, 2));

	// Update mapConfig.ts automatically
	const configPath = join(__dirname, '../src/lib/mapConfig.ts');
	let configContent = readFileSync(configPath, 'utf-8');

	// Find and replace MAP_BOUNDS
	const boundsRegex = /const MAP_BOUNDS = \{[\s\S]*?\n\};/;
	const newBounds = `const MAP_BOUNDS = {
	venue: {
		topLeft: { lat: ${maxY}, lng: ${minX} },
		bottomRight: { lat: ${minY}, lng: ${maxX} }
	},
	sanitation: {
		topLeft: { lat: ${maxY}, lng: ${minX} },
		bottomRight: { lat: ${minY}, lng: ${maxX} }
	},
	parking: {
		topLeft: { lat: ${maxY}, lng: ${minX} },
		bottomRight: { lat: ${minY}, lng: ${maxX} }
	}
};`;

	configContent = configContent.replace(boundsRegex, newBounds);

	writeFileSync(configPath, configContent, 'utf-8');
	console.log(`\n✓ Updated ${configPath}`);

	// Calculate some useful stats
	const centerLat = (maxY + minY) / 2;
	const centerLng = (minX + maxX) / 2;
	const latRange = maxY - minY;
	const lngRange = maxX - minX;

	console.log('\nMap Statistics:');
	console.log(`  Center: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`);
	console.log(`  Lat range: ${latRange.toFixed(6)}° (~${(latRange * 111).toFixed(0)}m)`);
	console.log(`  Lng range: ${lngRange.toFixed(6)}° (~${(lngRange * 111 * Math.cos(centerLat * Math.PI / 180)).toFixed(0)}m)`);
	console.log(`  Pixels per meter: ~${(width / (lngRange * 111 * Math.cos(centerLat * Math.PI / 180))).toFixed(2)}`);
}

const args = process.argv.slice(2);

if (args.length === 0) {
	console.error('Usage: node scripts/extract-map-bounds.js path/to/map.tif');
	console.error('\nDownload GeoTIFF from:');
	console.error('  https://mapwarper.net/maps/107468');
	console.error('  -> Export -> GeoTiff: Download rectified GeoTiff');
	process.exit(1);
}

const geotiffPath = args[0];

extractBounds(geotiffPath).catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
