import { useCallback, useEffect, useMemo } from 'react';
import { useUserId, useEndpoint, useStream } from '@rocket.chat/ui-contexts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Meteor } from 'meteor/meteor';
import type { ActivityNotificationRecord } from '/app/lib/collections/activityNotifications';

export type ActivityNotification = ActivityNotificationRecord;

export const useActivityNotifications = () => {
	const uid = useUserId();
	const queryClient = useQueryClient();
	const notifyUserStream = useStream('notify-user');
	//check correct usage from other places
	const getNotifications = useEndpoint('GET', '/v1/activity-notifications');

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

	useEffect(() => {
		if (!uid) {
			return;
		}
		// check if unknown can be changed to ActivityNotificationRecord
		const handleNotificationEvent = (event: unknown) => {
			const notification = event as ActivityNotificationRecord;

			queryClient.setQueryData(['activity-notifications', uid], (oldQueryData: ActivityNotificationRecord[] | undefined) => {
				const oldData = oldQueryData || [];

				// Match by messageId (thread root id) instead of _id
				const index = oldData.findIndex((n) => n.messageId === notification.messageId);

				if (index > -1) {
					const newData = [...oldData];
					newData[index] = notification;

					return newData.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
				}

				return [notification, ...oldData].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
				// remove sort if already sorted by default
			});

			void queryClient.invalidateQueries({
				queryKey: ['activity-center', 'notification-message', notification.messageId],
			});
		};

		const handleRemovalEvent = ({ messageId }: { messageId: string }) => {
			queryClient.setQueryData(['activity-notifications', uid], (oldData: ActivityNotificationRecord[] | undefined) => {
				if (!oldData) return [];
				return oldData.filter((n) => n.messageId !== messageId);
			});
		};

		const unsub = notifyUserStream(`${uid}/activity-notification`, handleNotificationEvent);
		const unsubRemoval = notifyUserStream(`${uid}/activity-notification-removed`, handleRemovalEvent);

		return () => {
			unsub();
			unsubRemoval();
		};
	}, [uid, notifyUserStream, queryClient]);

	const clearOne = useCallback(
		async (id: string) => {
			await Meteor.callAsync('activityNotifications:remove', id);

			queryClient.setQueryData(['activity-notifications', uid], (oldData: ActivityNotificationRecord[] | undefined) => {
				if (!oldData) return [];
				return oldData.filter((n) => n._id !== id);
			});
		},
		[queryClient, uid],
	);

	const clearAll = useCallback(async () => {
		await Meteor.callAsync('activityNotifications:clearAll');
		queryClient.setQueryData(['activity-notifications', uid], []);
	}, [queryClient, uid]);

	const markAsSeen = useCallback(
		async (id: string) => {
			await Meteor.callAsync('activityNotifications:markAsSeen', id);

			queryClient.setQueryData(['activity-notifications', uid], (oldData: ActivityNotificationRecord[] | undefined) => {
				if (!oldData) return [];

				return oldData.map((n) => (n._id === id ? { ...n, seen: true } : n));
			});
		},
		[queryClient, uid],
	);

	const getUnreadCount = useCallback(() => notifications.filter((n) => !n.seen).length, [notifications]);

	return useMemo(
		() => ({
			notifications,
			isLoading,
			clearOne,
			clearAll,
			markAsSeen,
			getUnreadCount,
		}),
		[notifications, isLoading, clearOne, clearAll, markAsSeen, getUnreadCount],
	);
};
