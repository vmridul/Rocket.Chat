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

import type { PaginatedRequest } from '../helpers/PaginatedRequest';
import type { PaginatedResult } from '../helpers/PaginatedResult';

export type ActivityNotificationGETParams = PaginatedRequest<{
	searchText?: string;
	roomType?: string;
	messageType?: string;
	unread?: string;
	fromDate?: string;
	toDate?: string;
	usernames?: string[];
	roomIds?: string[];
}>;

export type ActivityNotificationsEndpoints = {
	'/v1/activity-hub.notifications': {
		GET: (params: ActivityNotificationGETParams) => PaginatedResult<{
			notifications: ActivityNotification[];
		}>;
	};
	'/v1/activity-hub.notifications.delete': {
		POST: (params: ActivityHubNotificationsDeleteProps) => void;
	};
	'/v1/activity-hub.threads': {
		GET: (params: ActivityNotificationGETParams) => PaginatedResult<{
			notifications: ActivityNotification[];
		}>;
	};
	'/v1/activity-hub.mentions': {
		GET: (params: ActivityNotificationGETParams) => PaginatedResult<{
			notifications: ActivityNotification[];
		}>;
	};
	'/v1/activity-hub.reactions': {
		GET: (params: ActivityNotificationGETParams) => PaginatedResult<{
			notifications: ActivityNotification[];
		}>;
	};
	'/v1/activity-hub.discussions': {
		GET: (params: ActivityNotificationGETParams) => PaginatedResult<{
			notifications: ActivityNotification[];
		}>;
	};
	'/v1/activity-hub.pins': {
		GET: (params: ActivityNotificationGETParams) => PaginatedResult<{
			notifications: ActivityNotification[];
		}>;
	};
};
