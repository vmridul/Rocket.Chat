import type { RoomType } from '@rocket.chat/core-typings';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	initializeNotificationService,
	subscribeToNotifications,
	clearNotificationOne,
	clearAllNotifications,
	getUnreadNotificationCount,
} from '../services/notificationService';

export type ActivityNotification = {
	id: string;
	messageId: string;
	rid: string;
	roomName: string;
	roomType: RoomType;
	sender: {
		username?: string;
		name?: string;
	};
	text: string;
	title: string;
	notificationText: string;
	receivedAt: string;
	seen: boolean;
};

export const useActivityNotifications = () => {
	const [notifications, setNotifications] = useState<ActivityNotification[]>([]);

	useEffect(() => {
		// Initialize the global notification service
		initializeNotificationService();

		// Subscribe to notification updates
		const unsubscribe = subscribeToNotifications((data) => {
			setNotifications(data);
		});

		// Cleanup subscription on unmount
		return unsubscribe;
	}, []);

	const clearOne = useCallback((id: string) => {
		clearNotificationOne(id);
	}, []);

	const clearAll = useCallback(() => {
		clearAllNotifications();
	}, []);

	const getUnreadCount = useCallback((): number => {
		return getUnreadNotificationCount();
	}, []);

	return useMemo(
		() => ({
			notifications,
			clearOne,
			clearAll,
			getUnreadCount,
		}),
		[notifications, clearOne, clearAll, getUnreadCount],
	);
};
