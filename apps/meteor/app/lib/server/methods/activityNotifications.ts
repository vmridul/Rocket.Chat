import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { ActivityNotificationsCollection } from '../../collections/activityNotifications';

Meteor.methods({
	async 'activityNotifications:remove'(id: string) {
		check(id, String);
		if (!this.userId) {
			throw new Meteor.Error('error-not-authorized', 'Not authorized', { method: 'activityNotifications:remove' });
		}
		await ActivityNotificationsCollection.removeAsync({ _id: id, userId: this.userId });
	},
	async 'activityNotifications:clearAll'() {
		if (!this.userId) {
			throw new Meteor.Error('error-not-authorized', 'Not authorized', { method: 'activityNotifications:clearAll' });
		}
		await ActivityNotificationsCollection.removeAsync({ userId: this.userId });
	},
});
