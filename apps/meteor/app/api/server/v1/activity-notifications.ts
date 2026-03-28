import type { ActivityNotification } from '@rocket.chat/rest-typings';
import {
	ajv,
	isActivityHubNotificationsDeleteProps,
	validateBadRequestErrorResponse,
	validateUnauthorizedErrorResponse,
} from '@rocket.chat/rest-typings';

import {
	clearActivityNotifications,
	listActivityNotifications,
	removeActivityNotificationById,
	type ActivityNotificationFilter,
} from '../../../lib/server/lib/activityNotifications';
import { API } from '../api';

const activityNotificationSchema = {
	type: 'object',
	properties: {
		_id: {
			type: 'string',
		},
		userId: {
			type: 'string',
		},
		messageId: {
			type: 'string',
		},
		rid: {
			type: 'string',
		},
		roomName: {
			type: 'string',
			nullable: true,
		},
		roomType: {
			type: 'string',
		},
		sender: {
			type: 'object',
			properties: {
				username: {
					type: 'string',
					nullable: true,
				},
				name: {
					type: 'string',
					nullable: true,
				},
			},
			required: [],
			additionalProperties: false,
		},
		text: {
			type: 'string',
		},
		type: {
			type: 'string',
			enum: ['message', 'mention', 'highlight', 'reaction', 'pin'],
		},
		receivedAt: {
			anyOf: [{ type: 'string' }, { type: 'object' }],
		},
		isThreadReply: {
			type: 'boolean',
			nullable: true,
		},
		isDiscussion: {
			type: 'boolean',
			nullable: true,
		},
		isDiscussionReply: {
			type: 'boolean',
			nullable: true,
		},
		isTeam: {
			type: 'boolean',
			nullable: true,
		},
		isUnread: {
			type: 'boolean',
		},
	},
	required: ['_id', 'userId', 'messageId', 'rid', 'roomType', 'sender', 'text', 'type', 'receivedAt', 'isUnread'],
	additionalProperties: false,
};

type ActivityNotificationsResponse = {
	notifications: ActivityNotification[];
};

const activityNotificationsResponseSchema = ajv.compile<ActivityNotificationsResponse>({
	type: 'object',
	properties: {
		success: {
			type: 'boolean',
			enum: [true],
		},
		notifications: {
			type: 'array',
			items: activityNotificationSchema,
		},
	},
	required: ['success', 'notifications'],
	additionalProperties: false,
});

const activityNotificationsDeleteResponseSchema = ajv.compile<void>({
	type: 'object',
	properties: {
		success: {
			type: 'boolean',
			enum: [true],
		},
	},
	required: ['success'],
	additionalProperties: false,
});

const activityNotificationsEndpointProps = {
	authRequired: true,
	response: {
		200: activityNotificationsResponseSchema,
		400: validateBadRequestErrorResponse,
		401: validateUnauthorizedErrorResponse,
	},
};

const activityNotificationsAction =
	(filter: ActivityNotificationFilter) =>
	async function action() {
		const notifications = await listActivityNotifications({
			userId: this.userId,
			filter,
		});

		return API.v1.success({ notifications });
	};

API.v1.get('activity-hub.notifications', activityNotificationsEndpointProps, activityNotificationsAction('all'))
	.get('activity-hub.notifications.mentions', activityNotificationsEndpointProps, activityNotificationsAction('mentions'))
	.get('activity-hub.notifications.highlights', activityNotificationsEndpointProps, activityNotificationsAction('highlights'))
	.get('activity-hub.notifications.reactions', activityNotificationsEndpointProps, activityNotificationsAction('reactions'))
	.get('activity-hub.notifications.threads', activityNotificationsEndpointProps, activityNotificationsAction('threads'))
	.get('activity-hub.notifications.discussions', activityNotificationsEndpointProps, activityNotificationsAction('discussions'))
	.get('activity-hub.notifications.pins', activityNotificationsEndpointProps, activityNotificationsAction('pins'))
	.get('activity-notifications', activityNotificationsEndpointProps, activityNotificationsAction('all'))
	.post(
		'activity-hub.notifications.delete',
		{
			authRequired: true,
			body: isActivityHubNotificationsDeleteProps,
			response: {
				200: activityNotificationsDeleteResponseSchema,
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
			},
		},
		async function action() {
			const { id } = this.bodyParams as { id?: string };

			if (id) {
				await removeActivityNotificationById({ uid: this.userId, id });
				return API.v1.success();
			}

			await clearActivityNotifications({ uid: this.userId });
			return API.v1.success();
		},
	);
