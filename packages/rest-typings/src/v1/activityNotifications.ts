import { ajv } from './Ajv';

export type ActivityNotificationRecord = {
	_id: string;
	userId: string;
	messageId: string;
	rid: string;
	roomName?: string;
	roomType: string;
	sender: {
		username?: string;
		name?: string;
	};
	text: string;
	type: 'message' | 'mention' | 'highlight' | 'reaction' | 'pin';
	receivedAt: Date | string;
	isThreadReply?: boolean;
	isDiscussion?: boolean;
	isDiscussionReply?: boolean;
	isTeam?: boolean;
};

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
	'/v1/activity-hub.notifications.mentions': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.notifications.highlights': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.notifications.reactions': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.notifications.threads': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.notifications.discussions': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-hub.notifications.pins': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	'/v1/activity-notifications': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
};
