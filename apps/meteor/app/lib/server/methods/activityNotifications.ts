import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { clearActivityNotifications, removeActivityNotificationById } from '../lib/activityNotifications';

Meteor.methods({
	async 'activityNotifications:remove'(id: string) {
		check(id, String);
		if (!this.userId) {
			throw new Meteor.Error('error-not-authorized', 'Not authorized', { method: 'activityNotifications:remove' });
		}
		await removeActivityNotificationById({ uid: this.userId, id });
	},
	async 'activityNotifications:clearAll'() {
		if (!this.userId) {
			throw new Meteor.Error('error-not-authorized', 'Not authorized', { method: 'activityNotifications:clearAll' });
		}
		await clearActivityNotifications({ uid: this.userId });
	},
});
