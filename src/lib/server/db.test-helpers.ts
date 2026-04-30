/**
 * Creates an isolated in-memory SQLite database with the full schema applied.
 * Use one instance per test (or test file) to avoid state bleed.
 *
 * Usage:
 *   import { createTestDb } from '$lib/server/db.test-helpers.js';
 *   const { db } = createTestDb();
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export function createTestDb() {
	const sqlite = new Database(':memory:');

	// Enable foreign keys and WAL for consistency with production
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('journal_mode = WAL');

	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			password_hash TEXT,
			facebook_id TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS groups (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			admin_password_hash TEXT NOT NULL,
			allow_guests INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS members (
			id TEXT PRIMARY KEY,
			group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
			user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
			name TEXT NOT NULL,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS invite_links (
			id TEXT PRIMARY KEY,
			group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
			expires_at TEXT,
			max_uses INTEGER,
			use_count INTEGER NOT NULL DEFAULT 0,
			is_active INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS schedule (
			id TEXT PRIMARY KEY,
			band TEXT NOT NULL,
			day TEXT NOT NULL,
			stage TEXT NOT NULL,
			date TEXT NOT NULL,
			time_start TEXT NOT NULL,
			time_end TEXT NOT NULL,
			rfp_url TEXT,
			updated_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS schedule_snapshots (
			id TEXT PRIMARY KEY,
			snapshot_data TEXT NOT NULL,
			scraped_at TEXT NOT NULL,
			added_count INTEGER NOT NULL DEFAULT 0,
			updated_count INTEGER NOT NULL DEFAULT 0,
			deleted_count INTEGER NOT NULL DEFAULT 0,
			source TEXT NOT NULL,
			label TEXT,
			is_active INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS picks (
			id TEXT PRIMARY KEY,
			member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
			user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
			schedule_id TEXT NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS group_events (
			id TEXT PRIMARY KEY,
			group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			description TEXT,
			day TEXT NOT NULL,
			date TEXT NOT NULL,
			time_start TEXT NOT NULL,
			time_end TEXT,
			created_by_member_id TEXT,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS group_event_attendees (
			id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
			member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS admin_sessions (
			id TEXT PRIMARY KEY,
			expires_at TEXT NOT NULL,
			created_at TEXT NOT NULL
		);
	`);

	const db = drizzle(sqlite, { schema });
	return { db, sqlite };
}
