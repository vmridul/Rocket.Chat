import { api } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import { Messages } from '@rocket.chat/models';

import { ActivityNotificationsCollection } from '../../collections/activityNotifications';
import { Rooms } from '@rocket.chat/models';

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
	let type: 'message' | 'mention' | 'reply' = 'message';

	if (hasMentionToUser) {
		type = 'mention';
	} else if (hasReplyToThread) {
		type = 'reply';
	}

	// room used for navigation
	let notificationRoom = {
		rid: room._id,
		roomType: room.t,
		roomName,

		// room used only for display in activity center
		displayRid: room._id,
		displayRoomType: room.t,
		displayRoomName: roomName,
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
			notificationRoom.displayRid = parentRoom._id;
			notificationRoom.displayRoomType = parentRoom.t;
			notificationRoom.displayRoomName = parentRoom.fname ?? parentRoom.name;
		}
	}

	const docId = `${uid}:${rootMessageId}`;

	await ActivityNotificationsCollection.upsertAsync(
		{ userId: uid, messageId: rootMessageId },
		{
			$set: {
				// real room for navigation
				rid: notificationRoom.rid,
				roomType: notificationRoom.roomType,
				roomName: notificationRoom.roomName,

				// display room (parent channel for discussions)
				displayRid: notificationRoom.displayRid,
				displayRoomType: notificationRoom.displayRoomType,
				displayRoomName: notificationRoom.displayRoomName,

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
