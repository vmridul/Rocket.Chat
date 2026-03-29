import type { ComponentProps } from 'react';
import type { Icon } from '@rocket.chat/fuselage';

import type { ActivityNotification } from '../../../hooks/useActivityNotifications';

type IconName = ComponentProps<typeof Icon>['name'];

export const getActivityTypeIcon = (notification: ActivityNotification): IconName => {
	if (notification.kind === 'pin') {
		return 'pin';
	}

	if (notification.kind === 'reaction') {
		return 'emoji';
	}

	if (notification.kind === 'discussion-created') {
		return 'discussion';
	}

	if (notification.kind === 'mention' || notification.kind === 'highlight') {
		return 'at';
	}

	if (notification.kind === 'reply' && Boolean(notification.message.tmid)) {
		return 'thread';
	}

	return 'message';
};
