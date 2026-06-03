import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	passwordHash: text('password_hash'), // nullable for OAuth-only users
	facebookId: text('facebook_id'),
	pictureUrl: text('picture_url'),
	createdAt: text('created_at').notNull()
});

export const groups = sqliteTable('groups', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	createdByUserId: text('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
	createdAt: text('created_at').notNull()
	// note: admin_password_hash and allow_guests columns still exist in DB but are no longer used
});

export const members = sqliteTable('members', {
	id: text('id').primaryKey(),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	customColor: text('custom_color'), // nullable - if null, use auto-generated color
	createdAt: text('created_at').notNull()
});

export const inviteLinks = sqliteTable('invite_links', {
	id: text('id').primaryKey(),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	expiresAt: text('expires_at'),
	maxUses: integer('max_uses'),
	useCount: integer('use_count').notNull().default(0),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
	createdAt: text('created_at').notNull()
});

export const schedule = sqliteTable('schedule', {
	id: text('id').primaryKey(),
	band: text('band').notNull(),
	day: text('day').notNull(),
	stage: text('stage').notNull(),
	date: text('date').notNull(),
	timeStart: text('time_start').notNull(),
	timeEnd: text('time_end').notNull(),
	rfpUrl: text('rfp_url'),
	updatedAt: text('updated_at').notNull()
});

export const appSettings = sqliteTable('app_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export const scheduleSnapshots = sqliteTable('schedule_snapshots', {
	id: text('id').primaryKey(),
	snapshotData: text('snapshot_data').notNull(),
	scrapedAt: text('scraped_at').notNull(),
	addedCount: integer('added_count').notNull().default(0),
	updatedCount: integer('updated_count').notNull().default(0),
	deletedCount: integer('deleted_count').notNull().default(0),
	source: text('source').notNull(),
	label: text('label'),
	isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false)
});

export const picks = sqliteTable('picks', {
	id: text('id').primaryKey(),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	// For registered users, userId is set so picks are shared across all groups
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
	scheduleId: text('schedule_id')
		.notNull()
		.references(() => schedule.id, { onDelete: 'cascade' }),
	createdAt: text('created_at').notNull()
});

export const groupEvents = sqliteTable('group_events', {
	id: text('id').primaryKey(),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	title: text('title').notNull(),
	description: text('description'),
	day: text('day').notNull(),
	date: text('date').notNull(),
	timeStart: text('time_start').notNull(),
	timeEnd: text('time_end'),
	createdByMemberId: text('created_by_member_id'),
	createdAt: text('created_at').notNull()
});

export const groupEventAttendees = sqliteTable('group_event_attendees', {
	id: text('id').primaryKey(),
	eventId: text('event_id')
		.notNull()
		.references(() => groupEvents.id, { onDelete: 'cascade' }),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	createdAt: text('created_at').notNull()
});

export const adminSessions = sqliteTable('admin_sessions', {
	id: text('id').primaryKey(),
	expiresAt: text('expires_at').notNull(),
	createdAt: text('created_at').notNull()
});

export const mapPins = sqliteTable('map_pins', {
	id: text('id').primaryKey(),
	groupId: text('group_id')
		.notNull()
		.references(() => groups.id, { onDelete: 'cascade' }),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	x: integer('x').notNull(), // 0-100 percentage on image
	y: integer('y').notNull(), // 0-100 percentage on image
	latitude: integer('latitude'), // GPS coord (nullable for manual pins)
	longitude: integer('longitude'), // GPS coord (nullable for manual pins)
	label: text('label').notNull(),
	note: text('note'),
	icon: text('icon').notNull().default('📍'), // emoji icon
	color: text('color').notNull().default('#8b5cf6'), // hex color
	expiresAt: text('expires_at'), // for temporary "I'm here now" pins
	createdAt: text('created_at').notNull()
});

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Member = typeof members.$inferSelect;
export type InviteLink = typeof inviteLinks.$inferSelect;
export type Schedule = typeof schedule.$inferSelect;
export type ScheduleSnapshot = typeof scheduleSnapshots.$inferSelect;
export type Pick = typeof picks.$inferSelect;
export type GroupEvent = typeof groupEvents.$inferSelect;
export type GroupEventAttendee = typeof groupEventAttendees.$inferSelect;
export type MapPin = typeof mapPins.$inferSelect;
