import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db.js';
import { mapPins, groups } from '$lib/server/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { requireMemberAndGroup } from '$lib/server/auth.js';
import { gpsToImageCoords } from '$lib/mapConfig.js';
import { getMemberColor } from '$lib/memberColor.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { member, group } = requireMemberAndGroup(locals);

	const body = (await request.json()) as {
		x?: number;
		y?: number;
		latitude?: number;
		longitude?: number;
		label?: string;
		note?: string;
		icon?: string;
		expiresInHours?: number;
	};

	const label = body.label?.trim();
	const icon = body.icon?.trim() || '📍';
	const color = getMemberColor(member.id, member.customColor);

	if (!label) {
		throw error(400, 'Label is required');
	}

	let x = body.x;
	let y = body.y;

	// If GPS coordinates provided, convert to image coords (venue map)
	if (body.latitude !== undefined && body.longitude !== undefined) {
		const coords = gpsToImageCoords(body.latitude, body.longitude, 'venue');
		x = coords.x;
		y = coords.y;
	}

	if (x === undefined || y === undefined || x < 0 || x > 100 || y < 0 || y > 100) {
		throw error(400, 'Invalid coordinates');
	}

	const expiresAt = body.expiresInHours
		? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000).toISOString()
		: null;

	const pin = {
		id: nanoid(10),
		groupId: group.id,
		memberId: member.id,
		x: Math.round(x),
		y: Math.round(y),
		latitude: body.latitude ?? null,
		longitude: body.longitude ?? null,
		label,
		note: body.note?.trim() || null,
		icon,
		color,
		expiresAt,
		createdAt: new Date().toISOString()
	};

	db.insert(mapPins).values(pin).run();

	return json({ pin });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const { member, group } = requireMemberAndGroup(locals);

	const body = (await request.json()) as { pinId?: string };
	const pinId = body.pinId?.trim();

	if (!pinId) throw error(400, 'pinId required');

	const pin = db.select().from(mapPins).where(eq(mapPins.id, pinId)).get();

	if (!pin) throw error(404, 'Pin not found');

	// Only the creator or group owner can delete a pin
	const isGroupOwner = locals.user && group.createdByUserId === locals.user.id;
	if (pin.memberId !== member.id && !isGroupOwner) {
		throw error(403, 'You can only delete your own pins');
	}

	db.delete(mapPins).where(eq(mapPins.id, pinId)).run();

	return json({ deleted: true });
};
