# Map Calibration Guide

The festival map uses GPS coordinates to place pins accurately on the venue image. To ensure accuracy, you need to calibrate the map bounds using a georeferenced map file.

## Quick Setup

### 1. Download the GeoTIFF

Visit the georeferenced map on MapWarper:
- URL: https://mapwarper.net/maps/107468 (or your specific map ID)
- Click **Export** → **GeoTiff: Download rectified GeoTiff**
- Save the `.tif` file (e.g., `festival-venue.tif`)

### 2. Run the Calibration Script

```bash
npm run map:calibrate path/to/festival-venue.tif
```

This script will:
- Read the GeoTIFF metadata
- Extract the precise geographic bounds
- Automatically update `src/lib/mapConfig.ts` with the correct coordinates
- Show you useful stats (map center, coverage area, accuracy)

### 3. Verify the Update

Check `src/lib/mapConfig.ts` - the `MAP_BOUNDS` constant should now have real coordinates instead of the placeholder values.

## What the GeoTIFF Contains

A GeoTIFF is a regular TIFF image with embedded geographic metadata:
- **Corner coordinates**: Latitude/longitude of each map corner
- **Projection**: Coordinate system (usually WGS84 for web maps)
- **Resolution**: Meters per pixel

This metadata allows the script to automatically calculate:
- Top-left corner (northwest) GPS coordinates
- Bottom-right corner (southeast) GPS coordinates
- Map center point
- Coverage area in meters
- Pixel-to-meter ratio

## Manual Calibration (Alternative)

If you don't have a GeoTIFF, you can use the **Ground Control Points CSV** instead:

1. Download CSV from MapWarper Export section
2. Find corner control points in the CSV
3. Manually update `src/lib/mapConfig.ts`:

```typescript
const MAP_BOUNDS = {
  venue: {
    topLeft: { lat: 50.2145, lng: 15.8320 },      // Northwest corner
    bottomRight: { lat: 50.2098, lng: 15.8425 }   // Southeast corner
  }
};
```

## How It Works

The app uses **linear interpolation** to convert between:
- **GPS coordinates** (latitude, longitude) ← what your phone provides
- **Image coordinates** (x%, y%) ← where to draw the pin on the map

The conversion formula:
```
x% = (lng - topLeft.lng) / (bottomRight.lng - topLeft.lng) * 100
y% = (topLeft.lat - lat) / (topLeft.lat - bottomRight.lat) * 100
```

## Accuracy

- **With GeoTIFF**: Typically accurate to 5-10 meters
- **With approximate bounds**: Accurate to 50-100 meters
- **Without calibration**: Completely wrong placement

For a festival venue map, GeoTIFF calibration gives you building-level accuracy.

## Troubleshooting

**Pins appear in wrong location?**
- Re-download the GeoTIFF and run calibration again
- Verify the map image URL in `MAP_TYPES.venue.imageUrl` matches the GeoTIFF
- Check that the map hasn't been updated/changed on MapWarper

**Script errors reading GeoTIFF?**
- Make sure you downloaded the GeoTIFF, not the PNG or KML
- Check the file isn't corrupted (should be several MB in size)
- Try re-downloading from MapWarper

**Map still using old bounds?**
- Restart the dev server after calibration
- Check git diff to see if `mapConfig.ts` was actually updated
- Clear browser cache (Ctrl+Shift+R)

## Map Sources

If you need to create a new georeferenced map:
1. Upload your map image to https://mapwarper.net
2. Add control points matching image features to GPS coordinates
3. Wait for processing (rectification)
4. Download the GeoTIFF and calibrate
