import { Mongo } from 'meteor/mongo';
import type { ActivityNotificationRecord } from '@rocket.chat/rest-typings';

export type { ActivityNotificationRecord };

export const ActivityNotificationsCollection = new Mongo.Collection<ActivityNotificationRecord>('rocketchat_activity_notifications');
