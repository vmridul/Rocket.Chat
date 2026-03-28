import { api } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import { Messages, Rooms, Subscriptions, Users } from '@rocket.chat/models';

import {
	ActivityNotificationsCollection,
	type ActivityNotification,
	type ActivityNotificationRecord,
} from '../../collections/activityNotifications';
import { callbacks } from '../../../../server/lib/callbacks';
import { settings } from '../../../../app/settings/server';

const isNotificationUnread = ({ receivedAt, roomLastSeen }: { receivedAt: Date | string; roomLastSeen?: Date }): boolean => {
	const receivedAtDate = new Date(receivedAt);

	if (Number.isNaN(receivedAtDate.getTime())) {
		return true;
	}

	if (roomLastSeen && roomLastSeen >= receivedAtDate) {
		return false;
	}

	return true;
};

export const activityNotificationFilterPredicates = {
	all: (_notification: ActivityNotificationRecord): boolean => true,
	mentions: (notification: ActivityNotificationRecord): boolean => notification.type === 'mention',
	highlights: (notification: ActivityNotificationRecord): boolean => notification.type === 'highlight',
	reactions: (notification: ActivityNotificationRecord): boolean => notification.type === 'reaction',
	threads: (notification: ActivityNotificationRecord): boolean => Boolean(notification.isThreadReply),
	discussions: (notification: ActivityNotificationRecord): boolean =>
		Boolean(notification.isDiscussion) || Boolean(notification.isDiscussionReply),
	pins: (notification: ActivityNotificationRecord): boolean => notification.type === 'pin',
} as const;

export type ActivityNotificationFilter = keyof typeof activityNotificationFilterPredicates;

const normalizeActivityNotificationType = (notification: ActivityNotificationRecord): ActivityNotificationRecord => {
	if ((notification as ActivityNotificationRecord & { type: string }).type !== 'reply') {
		return notification;
	}

	return {
		...notification,
		type: 'mention',
	};
};

export const listActivityNotifications = async ({
	userId,
	filter = 'all',
	limit = 300,
}: {
	userId: string;
	filter?: ActivityNotificationFilter;
	limit?: number;
}): Promise<ActivityNotification[]> => {
	const notifications = await ActivityNotificationsCollection.find(
		{ userId },
		{
			sort: { receivedAt: -1 },
			limit,
		},
	).fetchAsync();

	const normalizedNotifications = notifications.map(normalizeActivityNotificationType);
	const filteredNotifications = normalizedNotifications.filter(activityNotificationFilterPredicates[filter]);

	return hydrateActivityNotificationsReadState({
		userId,
		notifications: filteredNotifications,
	});
};

export const clearActivityNotifications = async ({ uid }: { uid: string }): Promise<void> => {
	const notifications = await ActivityNotificationsCollection.find({ userId: uid }, { projection: { _id: 1, messageId: 1 } }).fetchAsync();

	if (notifications.length === 0) {
		return;
	}

	await ActivityNotificationsCollection.removeAsync({ userId: uid });

	for (const notification of notifications) {
		void api.broadcast('notify.activity-notification-removed', uid, { messageId: notification.messageId });
	}
};

export const removeActivityNotificationById = async ({ uid, id }: { uid: string; id: string }): Promise<void> => {
	const notification = await ActivityNotificationsCollection.findOneAsync({ _id: id, userId: uid });

	if (!notification) {
		return;
	}

	const removed = await ActivityNotificationsCollection.removeAsync({ _id: id, userId: uid });

	if (removed) {
		void api.broadcast('notify.activity-notification-removed', uid, { messageId: notification.messageId });
	}
};

export const hydrateActivityNotificationsReadState = async ({
	userId,
	notifications,
}: {
	userId: string;
	notifications: ActivityNotificationRecord[];
}): Promise<ActivityNotification[]> => {
	if (notifications.length === 0) {
		return [] as ActivityNotification[];
	}

	const roomIds = [...new Set(notifications.map((notification) => notification.rid))];

	const subscriptions = await Subscriptions.findByUserIdAndRoomIds(userId, roomIds, {
		projection: { rid: 1, ls: 1, tunread: 1 },
	}).toArray();

	const roomSubById = new Map(subscriptions.map((subscription) => [subscription.rid, subscription]));

	return notifications.map((notification) => {
		const sub = roomSubById.get(notification.rid);
		const tunread = sub?.tunread || [];
		let isUnread = true;

		if (notification.isThreadReply) {
			isUnread = tunread.includes(notification.messageId);
		} else {
			isUnread = isNotificationUnread({
				receivedAt: notification.receivedAt,
				roomLastSeen: sub?.ls,
			});
		}

		return {
			...notification,
			isUnread,
		} as ActivityNotification;
	});
};

export const createActivityNotification = async ({
	uid,
	message,
	room,
	roomName,
	sender,
	text,
	hasMentionToUser,
	hasReplyToThread,
	hasMentionToAll,
	hasMentionToHere,
	isUnfollowedThread,
	isHighlighted,
	isTeam,
	forcedType,
}: {
	uid: string;
	message: Pick<IMessage, '_id' | 'tmid' | 't'>;
	room: Pick<IRoom, '_id' | 't' | 'prid'>;
	roomName?: string;
	sender: Pick<IUser, 'username' | 'name'>;
	text?: string;
	hasMentionToUser: boolean;
	hasReplyToThread: boolean;
	hasMentionToAll?: boolean;
	hasMentionToHere?: boolean;
	isUnfollowedThread?: boolean;
	isHighlighted?: boolean;
	isTeam?: boolean;
	forcedType?: ActivityNotificationRecord['type'];
}): Promise<void> => {
	const type: ActivityNotificationRecord['type'] =
		forcedType ||
		// eslint-disable-next-line no-nested-ternary
		(hasMentionToUser || hasMentionToAll || hasMentionToHere || hasReplyToThread
			? 'mention'
			: isHighlighted
				? 'highlight'
				: text?.includes('reaction')
					? 'reaction'
					: 'message');

	let navigationRoom = { rid: room._id, roomType: room.t, roomName };
	let rootMessage = message as any;
	let rootMessageId = message.tmid ?? message._id;
	let isDiscussion = false;
	let isDiscussionReply = false;

	if (message.t === 'discussion-created' && rootMessage.drid) {
		const discussionRoom = await Rooms.findOneById(rootMessage.drid);
		if (discussionRoom) {
			rootMessageId = message._id;
			isDiscussion = true;
			navigationRoom = {
				rid: discussionRoom._id,
				roomType: discussionRoom.t,
				roomName: discussionRoom.fname ?? discussionRoom.name,
			};
		}
	} else if (room.prid) {
		const discussionMessage = await Messages.findOne({ drid: room._id }, { projection: { _id: 1, u: 1, msg: 1 } });
		if (discussionMessage?._id) {
			rootMessageId = discussionMessage._id;
			rootMessage = discussionMessage;
			isDiscussion = true;
			isDiscussionReply = true;
		}
	} else if (message.tmid) {
		const parent = await Messages.findOneById(message.tmid, { projection: { _id: 1, u: 1, msg: 1 } });
		if (parent) {
			rootMessage = parent;
		}
	}

	const docId = `${uid}:${rootMessageId}`;

	const updatePayload = {
		$set: {
			receivedAt: new Date(),
			isThreadReply: !!message.tmid,
			isDiscussion,
			isDiscussionReply,
			rid: navigationRoom.rid,
			roomType: navigationRoom.roomType,
			roomName: navigationRoom.roomName,
			isTeam,
			...(forcedType && {
				type,
				text: text ?? String(rootMessage.msg ?? '').slice(0, 300),
			}),
		},
	};

	if (isUnfollowedThread) {
		delete (updatePayload.$set as any).receivedAt;
		const result = await ActivityNotificationsCollection.updateAsync({ userId: uid, messageId: rootMessageId }, updatePayload);

		if (result === 0) {
			return;
		}
	} else {
		await ActivityNotificationsCollection.upsertAsync(
			{ userId: uid, messageId: rootMessageId },
			{
				...updatePayload,
				$setOnInsert: {
					_id: docId,
					userId: uid,
					messageId: rootMessageId,
					sender: {
						username: rootMessage.u?.username ?? sender.username,
						name: rootMessage.u?.name ?? sender.name,
					},
					...(!forcedType && {
						text: String(rootMessage.msg ?? text ?? '').slice(0, 300),
						type: type as any,
					}),
				},
			},
		);
	}

	const notificationDoc = await ActivityNotificationsCollection.findOneAsync({ _id: docId });

	if (notificationDoc) {
		const [hydratedNotification] = await hydrateActivityNotificationsReadState({ userId: uid, notifications: [notificationDoc] });
		void api.broadcast('notify.activity-notification', uid, hydratedNotification ?? notificationDoc);
	}
};

callbacks.add(
	'afterDeleteMessage',
	async (message: IMessage) => {
		if (!message?._id) {
			return message;
		}

		const affectedDocs = await ActivityNotificationsCollection.find({ messageId: message._id }).fetchAsync();

		await Promise.all(
			affectedDocs.map(async (doc: ActivityNotificationRecord) => {
				await ActivityNotificationsCollection.removeAsync({ _id: doc._id });
				void api.broadcast('notify.activity-notification-removed', doc.userId, { messageId: message._id });
			}),
		);

		return message;
	},
	callbacks.priority.LOW,
	'activityNotifications.afterDeleteMessage',
);

export const removeActivityNotification = async ({ uid, messageId }: { uid: string; messageId: string }): Promise<void> => {
	const docId = `${uid}:${messageId}`;
	const removed = await ActivityNotificationsCollection.removeAsync({ _id: docId });
	if (removed) {
		void api.broadcast('notify.activity-notification-removed', uid, { messageId });
	}
};

callbacks.add(
	'afterSetReaction',
	async (message: IMessage, { user, room }: { user: IUser; room: IRoom }) => {
		if (!message?.u?._id) {
			return;
		}

		await createActivityNotification({
			uid: message.u._id,
			message,
			room,
			roomName: room.fname ?? room.name,
			sender: user,
			text: 'reaction',
			hasMentionToUser: false,
			hasReplyToThread: false,
			isTeam: !!(room.teamMain || (room.teamId && room._id === room.teamId)),
			forcedType: 'reaction',
		});
	},
	callbacks.priority.LOW,
	'activityNotifications.afterSetReaction',
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
			projection: { 'u._id': 1, 'activityNotifications': 1, 'disableNotifications': 1 },
		}).toArray();

		await Promise.all(
			subscriptions.map((sub) => {
				if (sub.disableNotifications || sub.activityNotifications === 'nothing') {
					return;
				}

				return createActivityNotification({
					uid: sub.u._id,
					message,
					room,
					roomName: room.fname ?? room.name,
					sender: user,
					text: 'pin',
					hasMentionToUser: false,
					hasReplyToThread: false,
					isTeam: !!(room.teamMain || (room.teamId && room._id === room.teamId)),
					forcedType: 'pin',
				});
			}),
		);
	},
	callbacks.priority.LOW,
	'activityNotifications.afterPinMessage',
);
