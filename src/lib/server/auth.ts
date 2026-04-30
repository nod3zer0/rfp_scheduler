import { error, redirect } from '@sveltejs/kit';
import type { Member, Group, User } from './schema.js';

/**
 * Asserts that the request comes from an authenticated member.
 * Throws HTTP 401 if not. Use in API routes.
 */
export function requireMember(locals: App.Locals): Member {
	if (!locals.member) throw error(401, 'Not authenticated');
	return locals.member;
}

/**
 * Asserts that the request has both an active group and a member.
 * Throws HTTP 401 if not. Use in API routes that act on group data.
 */
export function requireMemberAndGroup(locals: App.Locals): { member: Member; group: Group } {
	if (!locals.member || !locals.group) throw error(401, 'Not authenticated');
	return { member: locals.member, group: locals.group };
}

/**
 * Asserts that the request has an active group context.
 * Redirects to '/' if not. Use in page load functions.
 */
export function requireGroupPage(locals: App.Locals): Group {
	if (!locals.group) redirect(303, '/');
	return locals.group;
}

/**
 * Asserts that the request comes from a logged-in user.
 * Redirects to /account/login if not. Use in page load functions.
 */
export function requireUserPage(locals: App.Locals): User {
	if (!locals.user) redirect(303, '/account/login');
	return locals.user;
}
