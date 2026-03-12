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

			return API.v1.success({
				notifications,
			});
		},
	},
);
