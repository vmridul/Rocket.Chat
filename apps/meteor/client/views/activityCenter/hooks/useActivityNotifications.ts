import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { IMessage } from '@rocket.chat/core-typings';
import type { ActivityNotification as ActivityNotificationItem } from '@rocket.chat/rest-typings';
import { useUserId, useEndpoint, useStream } from '@rocket.chat/ui-contexts';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type ActivityNotification = ActivityNotificationItem;

export const useActivityNotifications = () => {
	const uid = useUserId();
	const queryClient = useQueryClient();
	const queryClientRef = useRef(queryClient);
	const notifyUserStream = useStream('notify-user');
	const subscribeToRoomMessages = useStream('room-messages');
	const subscribeToNotifyUser = useStream('notify-user');
	const notificationUnsubscribersRef = useRef<Array<() => void>>([]);
	const roomUnsubscribersRef = useRef<Array<() => void>>([]);
	const getNotifications = useEndpoint('GET', '/v1/activity-hub.notifications');
	const deleteNotifications = useEndpoint('POST', '/v1/activity-hub.notifications.delete');

	queryClientRef.current = queryClient;

	const { data, isLoading } = useQuery({
		queryKey: ['activity-notifications', uid],
		queryFn: async () => {
			const result = await getNotifications();
			return result.notifications || [];
		},
		enabled: !!uid,
		staleTime: Infinity, // rely on streams for updates
	});

	const notifications = data || [];
	const messageIdsByRoom = useMemo(() => {
		return notifications.reduce((rooms, notification) => {
			const roomMessageIds = rooms.get(notification.room._id) ?? new Set<string>();
			roomMessageIds.add(notification.message._id);
			rooms.set(notification.room._id, roomMessageIds);
			return rooms;
		}, new Map<string, Set<string>>());
	}, [notifications]);

	const cleanupNotificationSubscriptions = useCallback(() => {
		notificationUnsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
		notificationUnsubscribersRef.current = [];
	}, []);

	const cleanupRoomSubscriptions = useCallback(() => {
		roomUnsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
		roomUnsubscribersRef.current = [];
	}, []);

	useEffect(() => {
		cleanupNotificationSubscriptions();

		if (!uid) {
			return cleanupNotificationSubscriptions;
		}
		const handleNotificationEvent = (event: unknown) => {
			const notification = event as ActivityNotification;

			queryClientRef.current.setQueryData(['activity-notifications', uid], (oldQueryData: ActivityNotification[] | undefined) => {
				const oldData = oldQueryData || [];

				const index = oldData.findIndex((n) => n.message._id === notification.message._id);

				if (index > -1) {
					const newData = [...oldData];
					newData[index] = notification;

					return newData.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
				}

				return [notification, ...oldData].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
			});

			void queryClientRef.current.invalidateQueries({
				queryKey: ['activity-center', 'notification-message', notification.message._id],
			});
		};

		const handleRemovalEvent = ({ messageId }: { messageId: string }) => {
			queryClientRef.current.setQueryData(['activity-notifications', uid], (oldData: ActivityNotification[] | undefined) => {
				if (!oldData) return [];
				return oldData.filter((n) => n.message._id !== messageId);
			});
		};

		const unsub = notifyUserStream(`${uid}/activity-notification`, handleNotificationEvent);
		const unsubRemoval = notifyUserStream(`${uid}/activity-notification-removed`, handleRemovalEvent);
		notificationUnsubscribersRef.current = [unsub, unsubRemoval];

		return cleanupNotificationSubscriptions;
	}, [uid, notifyUserStream, cleanupNotificationSubscriptions]);

	useEffect(() => {
		cleanupRoomSubscriptions();

		if (!uid || messageIdsByRoom.size === 0) {
			return cleanupRoomSubscriptions;
		}

		roomUnsubscribersRef.current = [...messageIdsByRoom.entries()].map(([rid, messageIds]) =>
			subscribeToRoomMessages(rid, (message: IMessage) => {
				if (!messageIds.has(message._id)) {
					return;
				}

				void queryClientRef.current.invalidateQueries({
					queryKey: ['activity-center', 'notification-message', message._id],
					exact: true,
				});
			}),
		);

		return cleanupRoomSubscriptions;
	}, [uid, messageIdsByRoom, subscribeToRoomMessages, cleanupRoomSubscriptions]);

	useEffect(() => {
		if (!uid) {
			return;
		}

		return subscribeToNotifyUser(`${uid}/subscriptions-changed`, () => {
			void queryClientRef.current.invalidateQueries({
				queryKey: ['activity-notifications', uid],
				exact: true,
			});
		});
	}, [uid, subscribeToNotifyUser]);

	const clearOne = useCallback(
		async (id: string) => {
			await deleteNotifications({ id });

			queryClient.setQueryData(['activity-notifications', uid], (oldData: ActivityNotification[] | undefined) => {
				if (!oldData) return [];
				return oldData.filter((n) => n._id !== id);
			});
		},
		[deleteNotifications, queryClient, uid],
	);

	const clearAll = useCallback(async () => {
		await deleteNotifications({});
		queryClient.setQueryData(['activity-notifications', uid], []);
	}, [deleteNotifications, queryClient, uid]);

	const getUnreadCount = useCallback(() => notifications.filter((n) => n.isUnread).length, [notifications]);

	return useMemo(
		() => ({
			notifications,
			isLoading,
			clearOne,
			clearAll,
			getUnreadCount,
		}),
		[notifications, isLoading, clearOne, clearAll, getUnreadCount],
	);
};
