import type { Member, Group, User } from '$lib/server/schema.js';

declare global {
	namespace App {
		interface Locals {
			member: Member | null;
			group: Group | null;
			user: User | null;
		}
	}
}

export {};
