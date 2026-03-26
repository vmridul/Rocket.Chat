import { api } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import { Messages, Rooms, Subscriptions } from '@rocket.chat/models';

import {
	ActivityNotificationsCollection,
	type ActivityNotification,
	type ActivityNotificationRecord,
} from '../../collections/activityNotifications';
import { callbacks } from '../../../../server/lib/callbacks';

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
}): Promise<void> => {
	const type: 'message' | 'mention' | 'highlight' | 'reaction' =
		// eslint-disable-next-line no-nested-ternary
		hasMentionToUser || hasMentionToAll || hasMentionToHere || hasReplyToThread
			? 'mention'
			: isHighlighted
				? 'highlight'
				: text?.includes('reaction')
					? 'reaction'
					: 'message';

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
					text: String(rootMessage.msg ?? text ?? '').slice(0, 300),
					type: type as any,
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
	async (message: IMessage, { room }: { room: IRoom }) => {
		if (!message?.u?._id) {
			return message;
		}

		await createActivityNotification({
			uid: message.u._id,
			message,
			room,
			roomName: room.fname ?? room.name,
			sender: message.u,
			text: 'reaction',
			hasMentionToUser: false,
			hasReplyToThread: false,
			isTeam: !!(room.teamMain || (room.teamId && room._id === room.teamId)),
		});

		return message;
	},
	callbacks.priority.LOW,
	'activityNotifications.afterSetReaction',
);
