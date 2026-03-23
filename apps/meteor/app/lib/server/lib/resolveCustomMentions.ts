import type { IMessage, MessageMention, IUser } from '@rocket.chat/core-typings';
import { CustomMentionGroups, Users } from '@rocket.chat/models';

import { resolveGroups } from '../../../../server/services/customMentionGroups/service';
import { callbacks } from '../../../../server/lib/callbacks';
import { hasPermissionAsync } from '../../../authorization/server/functions/hasPermission';

export async function resolveCustomMentions(message: IMessage, user?: Pick<IUser, '_id'>): Promise<IMessage> {
	// Parse groups from the message text
	const groups = await resolveGroups(message.msg || '');

	if (groups.length === 0) {
		return message;
	}

	const customMentions: NonNullable<IMessage['customMentions']> = [];

	message.mentions = message.mentions || [];

	// Check if user has permission to view custom mention groups
	const hasPermission = !user || (await hasPermissionAsync(user._id, 'view-custom-mention-groups'));

	for (const group of groups) {
		// Skip groups if user doesn't have permission
		if (!hasPermission) {
			// Remove the mention from the message mentions so it won't be processed
			message.mentions = message.mentions.filter((m) => m.username !== group.name || m.type !== 'group');
			continue;
		}

		// Remove shadowed user mentions (if any)
		message.mentions = message.mentions.filter((m) => m.username !== group.name || m.type !== 'user');

		// Resolve usernames for all members (for the snapshot)
		const resolvedUsernames: string[] = [];
		for (const userId of group.userIds) {
			const user = await Users.findOneById(userId, { projection: { username: 1 } });
			if (user?.username) {
				resolvedUsernames.push(user.username);
			}
		}

		// Freeze the snapshot into the message
		customMentions.push({
			groupId: group._id,
			groupName: group.name,
			description: group.description,
			resolvedUserIds: group.userIds,
			resolvedUsernames,
		});

		// Push the group itself into message.mentions with type 'group'
		// This allows the notification system to expand it via the callback
		const alreadyMentioned = message.mentions.some((m) => m._id === group._id && m.type === 'group');
		if (!alreadyMentioned) {
			message.mentions.push({
				_id: group._id,
				username: group.name,
				type: 'group' as any,
			});
		}
	}

	if (customMentions.length > 0) {
		message.customMentions = customMentions;
	}

	return message;
}

// Callback to expand 'group' mentions into user IDs for notifications
callbacks.add(
	'beforeGetMentions',
	async (mentionIds: string[], otherMentions: MessageMention[]): Promise<string[]> => {
		const groupMentions = otherMentions.filter((m) => m.type === 'group');
		if (!groupMentions.length) {
			return mentionIds;
		}

		const groupIds = groupMentions.map((m) => m._id);
		const groups = await CustomMentionGroups.findByIds(groupIds).toArray();
		const allUserIds = groups.flatMap((g) => g.userIds);

		return [...new Set([...mentionIds, ...allUserIds])];
	},
	callbacks.priority.MEDIUM,
	'before-get-mentions-get-groups',
);
