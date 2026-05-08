import { ActivityNotificationsCollection } from '../../../app/lib/collections/activityNotifications';

import { addMigration } from '../../lib/migrations';

addMigration({
	version: 336,
	name: 'Drop unique index from activity notifications collection',
	async up() {
		try {
			await ActivityNotificationsCollection.rawCollection().dropIndex('userId_1_message__id_1');
		} catch {
			// Index may not exist
		}
	},
});
