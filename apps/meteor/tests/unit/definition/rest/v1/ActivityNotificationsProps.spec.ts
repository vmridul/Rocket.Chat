import { isActivityHubNotificationsDeleteProps } from '@rocket.chat/rest-typings';
import { assert } from 'chai';

describe('ActivityNotificationsProps (definition/rest/v1)', () => {
	describe('isActivityHubNotificationsDeleteProps', () => {
		it('should be a function', () => {
			assert.isFunction(isActivityHubNotificationsDeleteProps);
		});

		it('should return true when id is omitted to allow clearing all notifications', () => {
			assert.isTrue(isActivityHubNotificationsDeleteProps({}));
		});

		it('should return true when id is provided', () => {
			assert.isTrue(isActivityHubNotificationsDeleteProps({ id: 'notification-id' }));
		});

		it('should return false when id is not a valid string value', () => {
			assert.isFalse(isActivityHubNotificationsDeleteProps({ id: {} }));
		});

		it('should return false when id is an empty string', () => {
			assert.isFalse(isActivityHubNotificationsDeleteProps({ id: '' }));
		});

		it('should return false when extra properties are provided', () => {
			assert.isFalse(isActivityHubNotificationsDeleteProps({ id: 'notification-id', extra: true }));
		});
	});
});
