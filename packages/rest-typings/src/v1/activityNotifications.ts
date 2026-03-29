import type { ActivityNotificationRecord } from '@rocket.chat/core-typings';
import { ajv } from './Ajv';

export type ActivityNotification = ActivityNotificationRecord & {
	isUnread: boolean;
};

export type ActivityHubNotificationsDeleteProps = {
	id?: string;
};

const ActivityHubNotificationsDeletePropsSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			minLength: 1,
		},
	},
	required: [],
	additionalProperties: false,
};

export const isActivityHubNotificationsDeleteProps = ajv.compile<ActivityHubNotificationsDeleteProps>(
	ActivityHubNotificationsDeletePropsSchema,
);

export type ActivityNotificationsEndpoints = {
	'/v1/activity-hub.notifications': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.notifications.delete': {
		POST: (params: ActivityHubNotificationsDeleteProps) => void;
	};
	'/v1/activity-hub.threads': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.mentions': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.reactions': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.discussions': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.pins': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
};
