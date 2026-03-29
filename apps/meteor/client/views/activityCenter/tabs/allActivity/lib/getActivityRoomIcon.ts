import type { ComponentProps } from 'react';
import type { Icon } from '@rocket.chat/fuselage';

import type { ActivityNotification } from '../../../hooks/useActivityNotifications';

type IconName = ComponentProps<typeof Icon>['name'];

export const getActivityRoomIcon = (notification: ActivityNotification): IconName => {
	if (notification.kind === 'discussion-created' || Boolean(notification.room.prid)) {
		return 'baloons';
	}

	if (notification.room.teamId) {
		return notification.room.t === 'p' ? 'team-lock' : 'team';
	}

	return notification.room.t === 'p' ? 'hashtag-lock' : 'hash';
};
