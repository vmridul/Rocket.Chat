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

export type ActivityNotificationsEndpoints = {
	'/v1/activity-notifications': {
		GET: () => {
			notifications: ActivityNotification[];
		};
	};
	// other endpoints that might be added later like clear
};
