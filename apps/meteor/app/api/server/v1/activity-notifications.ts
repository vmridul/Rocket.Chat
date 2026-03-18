import { ActivityNotificationsCollection } from '../../../lib/collections/activityNotifications';
import { API } from '../api';

API.v1.addRoute(
	'activity-notifications',
	{ authRequired: true },
	{
		async get() {
			if (!this.userId) {
				return API.v1.failure('error-not-authorized');
			}

			const limit = 300;

			const notifications = await ActivityNotificationsCollection.find(
				{ userId: this.userId },
				{
					sort: { receivedAt: -1 },
					limit,
				},
			).fetchAsync();

			const normalizedNotifications = notifications.map((notification) => {
				const notificationType = (notification as { type: string }).type;

				if (notificationType !== 'reply') {
					return notification;
				}

				return {
					...notification,
					type: 'mention' as const,
				};
			});

			return API.v1.success({
				notifications: normalizedNotifications,
			});
		},
	},
);
