import { api } from '@rocket.chat/core-services';
import type { IMessage, IRoom, IUser } from '@rocket.chat/core-typings';
import { Messages, Rooms, Subscriptions } from '@rocket.chat/models';

import { ActivityNotificationsCollection, type ActivityNotificationRecord } from '../../collections/activityNotifications';

type ActivityNotificationFilter = 'all' | 'threads' | 'mentions' | 'reactions' | 'discussions' | 'pins';

type ActivityNotificationFlags = {
	hasMentionToUser?: boolean;
	hasReplyToThread?: boolean;
	hasMentionToAll?: boolean;
	hasMentionToHere?: boolean;
	isUnfollowedThread?: boolean;
	isHighlighted?: boolean;
};

type ActivityNotificationMessage = Pick<IMessage, '_id' | 'tmid' | 't'>;
type ActivityNotificationRoom = Pick<IRoom, '_id' | 't' | 'prid' | 'teamId'>;
type ActivityNotificationSender = Pick<IUser, 'username' | 'name'>;

// Map filter to mongo query
const getActivityNotificationSelector = ({
	userId,
	filter,
}: {
	userId: string;
	filter: ActivityNotificationFilter;
}) => {
	switch (filter) {
		case 'threads':
			return { userId, 'message.tmid': { $exists: true } };
		case 'mentions':
			return { userId, kind: 'mention' };
		case 'reactions':
			return { userId, kind: 'reaction' };
		case 'discussions':
			return {
				userId,
				$or: [{ kind: 'discussion-created' }, { 'room.prid': { $exists: true } }],
			};
		case 'pins':
			return { userId, kind: 'pin' };
		case 'all':
		default:
			return { userId };
	}
};

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

// Add unread state for UI
const hydrateActivityNotificationsReadState = async ({
	userId,
	notifications,
}: {
	userId: string;
	notifications: ActivityNotificationRecord[];
}) => {
	if (notifications.length === 0) {
		return [];
	}

	const roomIds = [...new Set(notifications.map((notification) => notification.room._id))];
	const subscriptions = await Subscriptions.findByUserIdAndRoomIds(userId, roomIds, {
		projection: { rid: 1, ls: 1, tunread: 1 },
	}).toArray();
	const subscriptionsByRoomId = new Map(subscriptions.map((subscription) => [subscription.rid, subscription]));

	return notifications.map((notification) => {
		const subscription = subscriptionsByRoomId.get(notification.room._id);
		const threadUnreadIds = subscription?.tunread || [];
		const isUnread = notification.message.tmid
			? threadUnreadIds.includes(notification.message._id)
			: isNotificationUnread({
					receivedAt: notification.receivedAt,
					roomLastSeen: subscription?.ls,
				});

		return {
			...notification,
			isUnread,
		};
	});
};

// Build room data for navigation
const getNavigationRoom = ({
	room,
	roomName,
	teamId,
}: {
	room: ActivityNotificationRoom;
	roomName?: string;
	teamId?: string;
}): ActivityNotificationRecord['room'] => ({
	_id: room._id,
	name: roomName ?? '',
	t: room.t as ActivityNotificationRecord['room']['t'],
	...(room.prid && { prid: room.prid }),
	...(teamId && { teamId }),
});

// Resolve message context for grouping
const getActivityNotificationContext = async ({
	message,
	room,
	roomName,
	teamId,
	baseKind,
	forcedType,
}: {
	message: ActivityNotificationMessage;
	room: ActivityNotificationRoom;
	roomName?: string;
	teamId?: string;
	baseKind: ActivityNotificationRecord['kind'];
	forcedType?: ActivityNotificationRecord['kind'];
}) => {
	let navigationRoom = getNavigationRoom({ room, roomName, teamId });
	let rootMessage = message as IMessage;
	let rootMessageId = message.tmid ?? message._id;
	let kind = baseKind;
	let threadRootId: string | undefined;

	// Open the created discussion room
	if (message.t === 'discussion-created' && rootMessage.drid) {
		const discussionRoom = await Rooms.findOneById(rootMessage.drid);

		if (!discussionRoom) {
			return { navigationRoom, rootMessage, rootMessageId, kind, threadRootId };
		}

		return {
			navigationRoom: {
				_id: discussionRoom._id,
				name: discussionRoom.fname ?? discussionRoom.name ?? '',
				t: discussionRoom.t as ActivityNotificationRecord['room']['t'],
				...(discussionRoom.prid && { prid: discussionRoom.prid }),
				...(teamId && { teamId }),
			},
			rootMessage,
			rootMessageId: message._id,
			kind: forcedType ?? 'discussion-created',
			threadRootId,
		};
	}

	// Keep the real discussion message
	if (room.prid) {
		rootMessage = message as IMessage;
		rootMessageId = message._id;
		return { navigationRoom, rootMessage, rootMessageId, kind, threadRootId };
	}

	// Stop here for normal messages
	if (!message.tmid) {
		return { navigationRoom, rootMessage, rootMessageId, kind, threadRootId };
	}

	// Use parent text for preview
	const parentMessage = await Messages.findOneById(message.tmid, { projection: { _id: 1, u: 1, msg: 1 } });

	if (parentMessage) {
		rootMessage = parentMessage;
	}

	threadRootId = message.tmid;
	kind = forcedType ?? (baseKind === 'mention' || baseKind === 'highlight' ? baseKind : 'reply');

	return { navigationRoom, rootMessage, rootMessageId, kind, threadRootId };
};

// Keep preview text small for list
const getNotificationPreviewText = (text?: string): string => String(text ?? '').slice(0, 300);

// Set fields changed on every write
const buildActivityNotificationUpdatePayload = ({
	rootMessageId,
	threadRootId,
	navigationRoom,
	kind,
	text,
	rootMessageText,
	forcedType,
}: {
	rootMessageId: string;
	threadRootId?: string;
	navigationRoom: ActivityNotificationRecord['room'];
	kind: ActivityNotificationRecord['kind'];
	text?: string;
	rootMessageText?: string;
	forcedType?: ActivityNotificationRecord['kind'];
}): {
	$set: {
		receivedAt?: Date;
		message: {
			_id: string;
			tmid?: string;
		};
		room: ActivityNotificationRecord['room'];
		kind: ActivityNotificationRecord['kind'];
		text?: string;
	};
} => ({
	$set: {
		receivedAt: new Date(),
		message: {
			_id: rootMessageId,
			...(threadRootId && { tmid: threadRootId }),
		},
		room: navigationRoom,
		kind,
		...(forcedType && {
			text: getNotificationPreviewText(text ?? rootMessageText),
		}),
	},
});

// Set fields saved only once
const buildActivityNotificationInsertPayload = ({
	docId,
	userId,
	sender,
	rootMessage,
	text,
}: {
	docId: string;
	userId: string;
	sender: ActivityNotificationSender;
	rootMessage: IMessage;
	text?: string;
}) => ({
	_id: docId,
	userId,
	sender: {
		username: rootMessage.u?.username ?? sender.username,
		name: rootMessage.u?.name ?? sender.name,
	},
	text: getNotificationPreviewText(rootMessage.msg ?? text),
});

// Pick kind from incoming signals
const getActivityNotificationKind = ({
	forcedType,
	text,
	flags,
}: {
	forcedType?: ActivityNotificationRecord['kind'];
	text?: string;
	flags: Required<ActivityNotificationFlags>;
}): ActivityNotificationRecord['kind'] => {
	if (forcedType) {
		return forcedType;
	}

	if (flags.hasMentionToUser || flags.hasMentionToAll || flags.hasMentionToHere) {
		return 'mention';
	}

	if (flags.hasReplyToThread) {
		return 'reply';
	}

	if (flags.isHighlighted) {
		return 'highlight';
	}

	if (text?.includes('reaction')) {
		return 'reaction';
	}

	return 'message';
};

// Fill missing flags with defaults
const resolveActivityNotificationFlags = (flags: ActivityNotificationFlags = {}): Required<ActivityNotificationFlags> => ({
	hasMentionToUser: false,
	hasReplyToThread: false,
	hasMentionToAll: false,
	hasMentionToHere: false,
	isUnfollowedThread: false,
	isHighlighted: false,
	...flags,
});

// Save item and keep order rules
const writeActivityNotification = async ({
	docId,
	userId,
	updatePayload,
	insertPayload,
	isUnfollowedThread,
}: {
	docId: string;
	userId: string;
	updatePayload: ReturnType<typeof buildActivityNotificationUpdatePayload>;
	insertPayload: ReturnType<typeof buildActivityNotificationInsertPayload>;
	isUnfollowedThread: boolean;
}): Promise<boolean> => {
	// Keep old time for unfollowed threads
	if (isUnfollowedThread) {
		delete updatePayload.$set.receivedAt;

		const updated = await ActivityNotificationsCollection.updateAsync({ _id: docId, userId }, updatePayload);
		return updated > 0;
	}

	await ActivityNotificationsCollection.upsertAsync(
		{ _id: docId, userId },
		{
			...updatePayload,
			$setOnInsert: insertPayload,
		},
	);

	return true;
};

// Send updated item to client
const broadcastActivityNotification = async ({ userId, docId }: { userId: string; docId: string }): Promise<void> => {
	const notification = await ActivityNotificationsCollection.findOneAsync({ _id: docId, userId });

	if (!notification) {
		return;
	}

	const [hydratedNotification] = await hydrateActivityNotificationsReadState({
		userId,
		notifications: [notification],
	});

	void api.broadcast('notify.activity-notification', userId, hydratedNotification ?? notification);
};

// Tell client this item was removed
const broadcastActivityNotificationRemoval = ({ userId, messageId }: { userId: string; messageId: string }): void => {
	void api.broadcast('notify.activity-notification-removed', userId, { messageId });
};

export const listActivityNotifications = async ({
	userId,
	filter = 'all',
	limit = 300,
}: {
	userId: string;
	filter?: ActivityNotificationFilter;
	limit?: number;
}) => {
	// Load only rows for this filter
	const notifications = await ActivityNotificationsCollection.find(getActivityNotificationSelector({ userId, filter }), {
		sort: { receivedAt: -1 },
		limit,
	}).fetchAsync();

	return hydrateActivityNotificationsReadState({
		userId,
		notifications,
	});
};

export const clearActivityNotifications = async ({ uid }: { uid: string }): Promise<void> => {
	const notifications = await ActivityNotificationsCollection.find({ userId: uid }, { projection: { message: 1 } }).fetchAsync();

	if (notifications.length === 0) {
		return;
	}

	await ActivityNotificationsCollection.removeAsync({ userId: uid });

	// Remove cleared items from client
	for (const notification of notifications) {
		broadcastActivityNotificationRemoval({ userId: uid, messageId: notification.message._id });
	}
};

export const removeActivityNotificationById = async ({ uid, id }: { uid: string; id: string }): Promise<void> => {
	const notification = await ActivityNotificationsCollection.findOneAsync({ _id: id, userId: uid });

	if (!notification) {
		return;
	}

	const removed = await ActivityNotificationsCollection.removeAsync({ _id: id, userId: uid });

	if (removed) {
		broadcastActivityNotificationRemoval({ userId: uid, messageId: notification.message._id });
	}
};

type CreateActivityNotificationParams = {
	uid: string;
	message: ActivityNotificationMessage;
	room: ActivityNotificationRoom;
	roomName?: string;
	sender: ActivityNotificationSender;
	text?: string;
	flags?: ActivityNotificationFlags;
	teamId?: string;
	forcedType?: ActivityNotificationRecord['kind'];
};

export const createActivityNotification = async ({
	uid,
	message,
	room,
	roomName,
	sender,
	text,
	flags,
	teamId,
	forcedType,
}: CreateActivityNotificationParams): Promise<void> => {
	// Normalize flags before kind checks
	const resolvedFlags = resolveActivityNotificationFlags(flags);
	const kind = getActivityNotificationKind({
		forcedType,
		text,
		flags: resolvedFlags,
	});

	const context = await getActivityNotificationContext({
		message,
		room,
		roomName,
		teamId,
		baseKind: kind,
		forcedType,
	});

	const docId = `${uid}:${context.rootMessageId}`;
	// Build the record we persist
	const updatePayload = buildActivityNotificationUpdatePayload({
		rootMessageId: context.rootMessageId,
		threadRootId: context.threadRootId,
		navigationRoom: context.navigationRoom,
		kind: context.kind,
		text,
		rootMessageText: context.rootMessage.msg,
		forcedType,
	});
	const insertPayload = buildActivityNotificationInsertPayload({
		docId,
		userId: uid,
		sender,
		rootMessage: context.rootMessage,
		text,
	});

	const wasWritten = await writeActivityNotification({
		docId,
		userId: uid,
		updatePayload,
		insertPayload,
		isUnfollowedThread: resolvedFlags.isUnfollowedThread,
	});

	if (!wasWritten) {
		return;
	}

	// Push saved item to client
	await broadcastActivityNotification({ userId: uid, docId });
};

export const removeActivityNotification = async ({ uid, messageId }: { uid: string; messageId: string }): Promise<void> => {
	const docId = `${uid}:${messageId}`;
	const removed = await ActivityNotificationsCollection.removeAsync({ _id: docId, userId: uid });

	if (removed) {
		broadcastActivityNotificationRemoval({ userId: uid, messageId });
	}
};

export type { ActivityNotificationFilter };
export type { ActivityNotificationMessage, ActivityNotificationRoom, ActivityNotificationSender };
export type { IMessage, IRoom, IUser };
