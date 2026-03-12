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
	const getNotifications = useEndpoint('GET', '/v1/activity-notifications');

	const { data, isLoading } = useQuery({
		queryKey: ['activity-notifications', uid],
		queryFn: async () => {
			const result = await getNotifications();
			return result.notifications || [];
		},
		enabled: !!uid,
		staleTime: Infinity, // Rely on streams for updates
	});

	const notifications = data || [];

	useEffect(() => {
		if (!uid) {
			return;
		}

		const handleNotificationEvent = (event: unknown) => {
			const notification = event as ActivityNotificationRecord;
			queryClient.setQueryData(['activity-notifications', uid], (oldQueryData: ActivityNotificationRecord[] | undefined) => {
				const oldData = oldQueryData || [];
				// Check if we already have it to update, otherwise insert
				const index = oldData.findIndex((n) => n._id === notification._id);
				if (index > -1) {
					const newData = [...oldData];
					newData[index] = notification;
					// Sort by receivedAt descending
					return newData.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
				}
				// New notification, add and sort
				return [notification, ...oldData].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
			});
		};

		const unsub = notifyUserStream(`${uid}/activity-notification`, handleNotificationEvent);

		return () => {
			unsub();
		};
	}, [uid, notifyUserStream, queryClient]);

	const clearOne = useCallback(
		async (id: string) => {
			await Meteor.callAsync('activityNotifications:remove', id);
			// Optimistic sync - could alternatively just invalidate the query, but we know the exact id
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
