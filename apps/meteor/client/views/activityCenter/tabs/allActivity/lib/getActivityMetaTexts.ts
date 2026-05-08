import type { TFunction } from 'i18next';

import type { ActivityNotification } from '../../../hooks/useActivityNotifications';

export const getActivityMetaText = (notification: ActivityNotification, t: TFunction): string => {
	const isThreadReply = Boolean(notification.message.tmid);

	switch (notification.kind) {
		case 'discussion-created':
			return 'new discussion created';

		case 'reaction':
			return 'reacted to your message with';

		case 'pin':
			return 'pinned a message';

		case 'mention':
		case 'highlight':
			return isThreadReply ? 'mentioned you in a thread' : 'mentioned you';

		case 'reply':
		case 'message':
		default:
			if (isThreadReply) {
				return 'new reply in thread';
			}

			return 'sent a message';
	}
};
