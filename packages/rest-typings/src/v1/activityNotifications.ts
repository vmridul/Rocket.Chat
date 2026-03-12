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
	type: 'message' | 'mention' | 'reply';
	receivedAt: Date | string;
	seen: boolean;
};

export type ActivityNotificationsEndpoints = {
	'/v1/activity-notifications': {
		GET: () => {
			notifications: ActivityNotificationRecord[];
		};
	};
	// other endpoints that might be added later like clear/markAsSeen
};
