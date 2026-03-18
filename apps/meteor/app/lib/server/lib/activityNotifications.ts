import { api } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import { Messages, Rooms } from '@rocket.chat/models';

import { ActivityNotificationsCollection, type ActivityNotificationRecord } from '../../collections/activityNotifications';
import { callbacks } from '../../../../server/lib/callbacks';

export const createActivityNotification = async ({
	uid,
	message,
	room,
	roomName,
	sender,
	text,
	hasMentionToUser,
	hasReplyToThread,
}: {
	uid: string;
	message: Pick<IMessage, '_id' | 'tmid'>;
	room: Pick<IRoom, '_id' | 't' | 'prid'>;
	roomName?: string;
	sender: Pick<IUser, 'username' | 'name'>;
	text?: string;
	hasMentionToUser: boolean;
	hasReplyToThread: boolean;
}): Promise<void> => {
	const type: 'message' | 'mention' = hasMentionToUser || hasReplyToThread ? 'mention' : 'message';

	const navigationRoom = {
		rid: room._id,
		roomType: room.t,
		roomName,
	};

	let displayRoom = {
		rid: room._id,
		roomType: room.t,
		roomName,
	};

	let rootMessageId = message.tmid ?? message._id;

	// Handle discussions
	if (room.prid) {
		const [discussionMessage, parentRoom] = await Promise.all([
			Messages.findOne({ drid: room._id }, { projection: { _id: 1 } }),
			Rooms.findOneById(room.prid),
		]);

		// discussion thread root
		if (discussionMessage?._id) {
			rootMessageId = discussionMessage._id;
		}

		// show parent channel in UI
		if (parentRoom) {
			displayRoom = {
				rid: parentRoom._id,
				roomType: parentRoom.t,
				roomName: parentRoom.fname ?? parentRoom.name,
			};
		}
	}

	const docId = `${uid}:${rootMessageId}`;

	await ActivityNotificationsCollection.upsertAsync(
		{ userId: uid, messageId: rootMessageId },
		{
			$set: {
				rid: navigationRoom.rid,
				roomType: navigationRoom.roomType,
				roomName: navigationRoom.roomName,
				displayRid: displayRoom.rid,
				displayRoomType: displayRoom.roomType,
				displayRoomName: displayRoom.roomName,

				sender: {
					username: sender.username,
					name: sender.name,
				},

				text: String(text ?? '').slice(0, 300),
				type,
				receivedAt: new Date(),
				seen: false,
			},
			$setOnInsert: {
				_id: docId,
				userId: uid,
				messageId: rootMessageId,
			},
		},
	);

	const notificationDoc = await ActivityNotificationsCollection.findOneAsync({ _id: docId });

	if (notificationDoc) {
		void api.broadcast('notify.activity-notification', uid, notificationDoc);
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
