import { Mongo } from 'meteor/mongo';
import type { ActivityNotificationRecord } from '@rocket.chat/core-typings';

type ActivityNotification = ActivityNotificationRecord & {
	isUnread: boolean;
};

export type { ActivityNotification, ActivityNotificationRecord };

export const ActivityNotificationsCollection = new Mongo.Collection<ActivityNotificationRecord>('rocketchat_activity_notifications');
