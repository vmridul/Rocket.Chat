import { api } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import { Subscriptions, Users } from '@rocket.chat/models';

import { createActivityNotification, updateActivityNotificationText, removeActivityNotification } from './activityNotifications';
import { ActivityNotificationsCollection, type ActivityNotificationRecord } from '../../collections/activityNotifications';
import { callbacks } from '../../../../server/lib/callbacks';
import { settings } from '../../../../app/settings/server';

const getActivityNotificationTeamId = (room: IRoom): string | undefined =>
	(room.teamMain || (room.teamId && room._id === room.teamId)) ? room.teamId : undefined;

callbacks.add(
	'afterDeleteMessage',
	async (message: IMessage) => {
		if (!message?._id) {
			return message;
		}

		const affectedNotifications = await ActivityNotificationsCollection.find({
			'message._id': message._id,
		}).fetchAsync();

		await Promise.all(
			affectedNotifications.map(async (notification: ActivityNotificationRecord) => {
				await ActivityNotificationsCollection.removeAsync({ _id: notification._id });
				void api.broadcast('notify.activity-notification-removed', notification.userId, { messageId: message._id });
			}),
		);

		return message;
	},
	callbacks.priority.LOW,
	'activityNotifications.afterDeleteMessage',
);

callbacks.add(
	'afterSetReaction',
	async (message: IMessage, { user, reaction, room }: { user: IUser; reaction: string; room: IRoom }) => {
		if (!message?.u?._id) {
			return;
		}

		await createActivityNotification({
			uid: message.u._id,
			message,
			room,
			roomName: room.fname ?? room.name,
			sender: user,
			text: message.msg,
			emoji: reaction,
			teamId: getActivityNotificationTeamId(room),
			forcedType: 'reaction',
		});

		await updateActivityNotificationText({ message });
	},
	callbacks.priority.LOW,
	'activityNotifications.afterSetReaction',
);

callbacks.add(
	'afterUnsetReaction',
	async (message: IMessage, { user, reaction }: { user: IUser; reaction: string }) => {
		if (!message?._id || !message?.u?._id) {
			return message;
		}

		await removeActivityNotification({
			uid: message.u._id,
			messageId: `${message._id}:${user.username}:${reaction}`,
		});

		await updateActivityNotificationText({ message });

		return message;
	},
	callbacks.priority.LOW,
	'activityNotifications.afterUnsetReaction',
);

callbacks.add(
	'afterPinMessage',
	async (message: IMessage, { user, room }: { user: IUser; room: IRoom }) => {
		if (!message?.u?._id) {
			return;
		}

		const maxMembersForNotification = settings.get<number>('Notifications_Max_Room_Members');
		const roomMembersCount = await Users.countRoomMembers(room._id);
		const disableAllMessageNotifications = roomMembersCount > maxMembersForNotification && maxMembersForNotification !== 0;

		if (disableAllMessageNotifications) {
			return;
		}

		const subscriptions = await Subscriptions.findByRoomId(room._id, {
			projection: { 'u._id': 1, activityNotifications: 1, disableNotifications: 1 },
		}).toArray();

		await Promise.all(
			subscriptions.map((subscription) => {
				if (subscription.disableNotifications || subscription.activityNotifications === 'nothing') {
					return;
				}

				return createActivityNotification({
					uid: subscription.u._id,
					message,
					room,
					roomName: room.fname ?? room.name,
					sender: user,
					text: 'pin',
					teamId: getActivityNotificationTeamId(room),
					forcedType: 'pin',
				});
			}),
		);
	},
	callbacks.priority.LOW,
	'activityNotifications.afterPinMessage',
);

callbacks.add(
	'afterSaveMessage',
	async (message: IMessage) => {
		if (!('editedAt' in message) || !message?._id) {
			return message;
		}

		await updateActivityNotificationText({ message });

		return message;
	},
	callbacks.priority.LOW,
	'activityNotifications.afterSaveMessage',
);
