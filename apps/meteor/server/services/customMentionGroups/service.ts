import type { ICustomMentionGroup } from '@rocket.chat/core-typings';
import { CustomMentionGroups, Users } from '@rocket.chat/models';

// Configurable max group size (can be wired to a Setting later)
const MAX_GROUP_SIZE = 50;
const MIN_GROUP_SIZE = 1;

function validateGroupName(name: string): void {
	if (!name || name.trim().length === 0) {
		throw new Error('Group name cannot be empty');
	}

	// Rule 1: Only letters, numbers, and dots
	if (!/^[a-zA-Z0-9.]+$/.test(name)) {
		throw new Error('Group name can only contain letters, numbers, and dots');
	}

	if (name.length > 50) {
		throw new Error('Group name cannot exceed 50 characters');
	}
}

function normalizeDescription(description?: string): string | undefined {
	if (typeof description !== 'string') {
		return undefined;
	}

	const normalized = description.trim();
	if (!normalized) {
		return undefined;
	}

	if (normalized.length > 500) {
		throw new Error('Description cannot exceed 500 characters');
	}

	return normalized;
}

async function assertNameIsUnique(name: string, excludeId?: string): Promise<void> {
	const existing = await CustomMentionGroups.findOneByName(name);
	if (existing && existing._id !== excludeId) {
		throw new Error(`A custom mention group with the name "${name}" already exists`);
	}
}

async function resolveUserIds(identifiers: string[]): Promise<string[]> {
	const uniqueIdentifiers = [...new Set(identifiers)];
	const users = await Users.findActiveByIdsOrUsernames(uniqueIdentifiers, { projection: { _id: 1, username: 1 } }).toArray();

	if (users.length !== uniqueIdentifiers.length) {
		const found = new Set([...users.map((u) => u._id), ...users.map((u) => u.username).filter((u): u is string => Boolean(u))]);
		for (const identifier of uniqueIdentifiers) {
			if (!found.has(identifier)) {
				throw new Error(`User "${identifier}" does not exist`);
			}
		}
	}

	return users.map((u) => u._id);
}

export async function createGroup(name: string, userIds: string[], createdBy: string, description?: string): Promise<ICustomMentionGroup> {
	// Validate name
	validateGroupName(name);
	const normalizedDescription = normalizeDescription(description);

	// Rule 2: Name must be unique
	await assertNameIsUnique(name);

	// Rule 3: Max group size
	if (userIds.length === 0) {
		throw new Error('A group must have at least one member');
	}

	if (userIds.length > MAX_GROUP_SIZE) {
		throw new Error(`Group cannot have more than ${MAX_GROUP_SIZE} members`);
	}

	// Validate and resolve all users
	const resolvedUserIds = await resolveUserIds(userIds);

	const result = await CustomMentionGroups.createGroup({
		name,
		description: normalizedDescription,
		userIds: resolvedUserIds,
		createdBy,
	});

	const group = await CustomMentionGroups.findOneById(result.insertedId.toString());
	if (!group) {
		throw new Error('Failed to create group');
	}

	return group;
}

export async function updateGroup(groupId: string, name: string, userIds: string[], description?: string): Promise<void> {
	const group = await CustomMentionGroups.findOneById(groupId);
	if (!group) {
		throw new Error('Custom mention group not found');
	}

	// Validate name
	validateGroupName(name);
	const normalizedDescription = normalizeDescription(description);

	// Rule 2: Name must be unique (exclude current group)
	await assertNameIsUnique(name, groupId);

	// Rule 3: Max group size
	if (userIds.length === 0) {
		throw new Error('A group must have at least one member');
	}

	if (userIds.length > MAX_GROUP_SIZE) {
		throw new Error(`Group cannot have more than ${MAX_GROUP_SIZE} members`);
	}

	// Validate and resolve all users
	const resolvedUserIds = await resolveUserIds(userIds);

	await CustomMentionGroups.updateGroup(groupId, name, resolvedUserIds, normalizedDescription);
}

export async function deleteGroup(groupId: string): Promise<void> {
	const group = await CustomMentionGroups.findOneById(groupId);
	if (!group) {
		throw new Error('Custom mention group not found');
	}

	await CustomMentionGroups.deleteGroup(groupId);
}

export async function addMembers(groupId: string, userIds: string[]): Promise<void> {
	const group = await CustomMentionGroups.findOneById(groupId);
	if (!group) {
		throw new Error('Custom mention group not found');
	}

	if (userIds.length === 0) {
		throw new Error('No users provided to add');
	}

	// Validate and resolve all users
	const resolvedUserIds = await resolveUserIds(userIds);

	// Check max size won't be exceeded
	const newSize = new Set([...group.userIds, ...resolvedUserIds]).size;
	if (newSize > MAX_GROUP_SIZE) {
		throw new Error(`Adding these members would exceed the maximum group size of ${MAX_GROUP_SIZE}`);
	}

	await CustomMentionGroups.addMembers(groupId, resolvedUserIds);
}

export async function removeMembers(groupId: string, userIds: string[]): Promise<void> {
	const group = await CustomMentionGroups.findOneById(groupId);
	if (!group) {
		throw new Error('Custom mention group not found');
	}

	if (userIds.length === 0) {
		throw new Error('No users provided to remove');
	}

	// Validate and resolve all users
	const resolvedUserIds = await resolveUserIds(userIds);

	// Check minimum 1 member will remain
	const remaining = group.userIds.filter((id: string) => !resolvedUserIds.includes(id));
	if (remaining.length < MIN_GROUP_SIZE) {
		throw new Error('Group must have at least 1 member. Delete the group instead.');
	}

	await CustomMentionGroups.removeMembers(groupId, resolvedUserIds);
}

export async function resolveGroups(text: string): Promise<ICustomMentionGroup[]> {
	// Find all @groupName patterns in the message text
	const mentionPattern = /@([a-zA-Z0-9.]+)/g;
	const matches = [...text.matchAll(mentionPattern)].map((m) => m[1]);

	if (matches.length === 0) {
		return [];
	}

	// Look up each match against custom mention group names
	const groups: ICustomMentionGroup[] = [];
	for (const name of matches) {
		const group = await CustomMentionGroups.findOneByName(name);
		if (group) {
			groups.push(group);
		}
	}

	return groups;
}

export async function getGroupMembers(
	groupId: string,
	offset = 0,
	count = 50,
): Promise<{ members: { _id: string; username?: string; name?: string }[]; total: number }> {
	const group = await CustomMentionGroups.findOneById(groupId);
	if (!group) {
		throw new Error('Custom mention group not found');
	}

	const userIds = group.userIds.slice(offset, offset + count);

	const members: { _id: string; username?: string; name?: string }[] = [];
	for (const userId of userIds) {
		const user = await Users.findOneById(userId, {
			projection: { _id: 1, username: 1, name: 1 },
		});
		if (user) {
			members.push({ _id: user._id, username: user.username, name: user.name });
		}
	}

	return {
		members,
		total: group.userIds.length,
	};
}
