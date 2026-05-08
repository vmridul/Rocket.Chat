export type ActivityNotificationRecord = {
	_id: string;
	userId: string;
	message: {
		_id: string;
		tmid?: string;
	};
	room: {
		_id: string;
		name: string;
		t: 'c' | 'p' | 'd';
		prid?: string;
		teamId?: string;
	};
	kind: 'message' | 'mention' | 'highlight' | 'reaction' | 'reply' | 'pin' | 'discussion-created';
	sender: {
		username?: string;
		name?: string;
	};
	text: string;
	parentMsg?: string;
	emoji?: string;
	receivedAt: Date | string;
};
