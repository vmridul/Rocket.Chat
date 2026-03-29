import type { ActivityNotification } from '@rocket.chat/rest-typings';
import {
	ajv,
	isActivityHubNotificationsDeleteProps,
	validateBadRequestErrorResponse,
	validateUnauthorizedErrorResponse,
} from '@rocket.chat/rest-typings';
import type { PaginatedResult } from '@rocket.chat/rest-typings';

import { getPaginationItems } from '../helpers/getPaginationItems';

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
		message: {
			type: 'object',
			properties: {
				_id: {
					type: 'string',
				},
				tmid: {
					type: 'string',
					nullable: true,
				},
			},
			required: ['_id'],
			additionalProperties: false,
		},
		room: {
			type: 'object',
			properties: {
				_id: {
					type: 'string',
				},
				name: {
					type: 'string',
				},
				t: {
					type: 'string',
					enum: ['c', 'p', 'd'],
				},
				prid: {
					type: 'string',
					nullable: true,
				},
				teamId: {
					type: 'string',
					nullable: true,
				},
			},
			required: ['_id', 'name', 't'],
			additionalProperties: false,
		},
		kind: {
			type: 'string',
			enum: ['message', 'mention', 'highlight', 'reaction', 'reply', 'pin', 'discussion-created', 'star'],
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
		receivedAt: {
			anyOf: [{ type: 'string' }, { type: 'object' }],
		},
		isUnread: {
			type: 'boolean',
		},
	},
	required: ['_id', 'userId', 'message', 'room', 'kind', 'sender', 'text', 'receivedAt', 'isUnread'],
	additionalProperties: false,
};

type ActivityNotificationsResponse = PaginatedResult<{
	notifications: ActivityNotification[];
}>;

const activityNotificationsResponseSchema = ajv.compile<ActivityNotificationsResponse>({
	type: 'object',
	properties: {
		success: {
			type: 'boolean',
			enum: [true],
		},
		count: {
			type: 'number',
		},
		offset: {
			type: 'number',
		},
		total: {
			type: 'number',
		},
		notifications: {
			type: 'array',
			items: activityNotificationSchema,
		},
	},
	required: ['success', 'count', 'offset', 'total', 'notifications'],
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
	async function action(this: any) {
		const { offset, count } = await getPaginationItems(this.queryParams);
		const { searchText, roomType, messageType, unread, fromDate, toDate, usernames, roomIds } = this.queryParams;

		const result = await listActivityNotifications({
			userId: this.userId,
			filter,
			offset,
			count,
			searchText,
			roomType,
			messageType,
			unread,
			fromDate,
			toDate,
			usernames: usernames ? (Array.isArray(usernames) ? usernames : [usernames]) : undefined,
			roomIds: roomIds ? (Array.isArray(roomIds) ? roomIds : [roomIds]) : undefined,
		});

		return API.v1.success(result);
	};

API.v1.get('activity-hub.notifications', activityNotificationsEndpointProps, activityNotificationsAction('all'))
	.get('activity-hub.threads', activityNotificationsEndpointProps, activityNotificationsAction('threads'))
	.get('activity-hub.mentions', activityNotificationsEndpointProps, activityNotificationsAction('mentions'))
	.get('activity-hub.reactions', activityNotificationsEndpointProps, activityNotificationsAction('reactions'))
	.get('activity-hub.discussions', activityNotificationsEndpointProps, activityNotificationsAction('discussions'))
	.get('activity-hub.pins', activityNotificationsEndpointProps, activityNotificationsAction('pins'))
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
