import { api } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';

import { ActivityNotificationsCollection } from '../../collections/activityNotifications';

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
	message: Pick<IMessage, '_id'>;
	room: Pick<IRoom, '_id' | 't'>;
	roomName?: string;
	sender: Pick<IUser, 'username' | 'name'>;
	text?: string;
	hasMentionToUser: boolean;
	hasReplyToThread: boolean;
}): Promise<void> => {
	let type: 'message' | 'mention' | 'reply' = 'message';
	if (hasMentionToUser) {
		type = 'mention';
	} else if (hasReplyToThread) {
		type = 'reply';
	}

	const docId = `${uid}:${message._id}`;

	console.log('[ActivityNotification] creating for uid:', uid, 'messageId:', message._id); // ADD THIS

	await ActivityNotificationsCollection.upsertAsync(
		{ userId: uid, messageId: message._id },
		{
			$set: {
				rid: room._id,
				roomType: room.t,
				roomName,
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
				messageId: message._id,
			},
		},
	);

	const notificationDoc = await ActivityNotificationsCollection.findOneAsync({ _id: docId });
	if (notificationDoc) {
		void api.broadcast('notify.activity-notification', uid, notificationDoc);
	}
};
