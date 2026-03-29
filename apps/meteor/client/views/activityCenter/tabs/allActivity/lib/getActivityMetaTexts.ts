import type { TFunction } from 'i18next';

import type { ActivityNotification } from '../../../hooks/useActivityNotifications';

export const getActivityMetaText = (notification: ActivityNotification, t: TFunction): string => {
	const showRoomContext = notification.room.t !== 'd' || Boolean(notification.room.prid);
	const isThreadReply = Boolean(notification.message.tmid);
	const isDiscussionReply = Boolean(notification.room.prid);

	switch (notification.kind) {
		case 'discussion-created':
			return 'new discussion created';

		case 'reaction':
			return showRoomContext ? 'new reaction to your message in' : 'new reaction to your message';

		case 'pin':
			return showRoomContext ? 'new pinned message in' : 'new pinned message';

		case 'mention':
		case 'highlight':
			if (showRoomContext) {
				return isThreadReply ? 'mentioned you in a thread in' : 'mentioned you in';
			}

			return isThreadReply ? 'mentioned you in a thread' : 'mentioned you';

		case 'reply':
			if (isDiscussionReply) {
				return showRoomContext ? 'new message in' : 'new message';
			}

			if (isThreadReply) {
				return showRoomContext ? 'new reply in thread in' : 'new reply in thread';
			}

			return showRoomContext ? t('sent_a_message_in') : t('sent_you_a_message');

		case 'message':
		default:
			return showRoomContext ? t('sent_a_message_in') : t('sent_you_a_message');
	}
};
