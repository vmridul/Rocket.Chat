import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ActivityNotification as ActivityNotificationItem } from '@rocket.chat/rest-typings';
import { useUserId, useEndpoint, useStream } from '@rocket.chat/ui-contexts';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { ActivityCenterFiltersQuery } from '../contexts/ActivityCenterContext';
import type { PaginatedResult } from '@rocket.chat/rest-typings';

export type ActivityNotification = ActivityNotificationItem;

export const useActivityNotifications = (filters: ActivityCenterFiltersQuery, searchText: string) => {
	const uid = useUserId();
	const queryClient = useQueryClient();
	const queryClientRef = useRef(queryClient);
	const notifyUserStream = useStream('notify-user');
	const subscribeToNotifyUser = useStream('notify-user');
	const notificationUnsubscribersRef = useRef<Array<() => void>>([]);
	const getNotifications = useEndpoint('GET', '/v1/activity-hub.notifications');
	const deleteNotifications = useEndpoint('POST', '/v1/activity-hub.notifications.delete');

	queryClientRef.current = queryClient;

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
		queryKey: ['activity-notifications', uid, filters, searchText],
		queryFn: async ({ pageParam = 0 }): Promise<PaginatedResult<{ notifications: ActivityNotification[] }>> => {
			const result = await getNotifications({
				offset: pageParam,
				count: 50,
				searchText,
				...(filters.roomType !== 'all' && { roomType: filters.roomType }),
				...(filters.messageType !== 'all' && { messageType: filters.messageType }),
				...(filters.unread !== 'all' && { unread: filters.unread }),
				...(filters.fromDate && { fromDate: filters.fromDate }),
				...(filters.toDate && { toDate: filters.toDate }),
				...(filters.usernames && filters.usernames.length > 0 && { usernames: filters.usernames }),
				...(filters.roomIds && filters.roomIds.length > 0 && { roomIds: filters.roomIds }),
			});
			return result;
		},
		getNextPageParam: (lastPage) => {
			const nextOffset = lastPage.offset + lastPage.count;
			return nextOffset < lastPage.total ? nextOffset : undefined;
		},
		initialPageParam: 0,
		enabled: !!uid,
		staleTime: Infinity,
	});

	const notifications = useMemo(() => {
		return data?.pages.flatMap((page) => page.notifications) || [];
	}, [data]);

	const cleanupNotificationSubscriptions = useCallback(() => {
		notificationUnsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
		notificationUnsubscribersRef.current = [];
	}, []);

	useEffect(() => {
		cleanupNotificationSubscriptions();

		if (!uid) {
			return cleanupNotificationSubscriptions;
		}

		const handleNotificationEvent = (event: unknown) => {
			const notification = event as ActivityNotification;

			queryClientRef.current.setQueryData(
				['activity-notifications', uid, filters, searchText],
				(oldData: any) => {
					if (!oldData || !oldData.pages) return oldData;

					let found = false;
					const newPages = oldData.pages.map((page: any, index: number) => {
						if (found) return page; // Optimization: early return if already found
						const existingIndex = page.notifications.findIndex((n: any) => n.message._id === notification.message._id);
						if (existingIndex > -1) {
							found = true;
							const newNotifications = [...page.notifications];
							newNotifications[existingIndex] = notification;
							return { ...page, notifications: newNotifications };
						}
						return page;
					});

					if (!found && newPages.length > 0) {
						newPages[0] = {
							...newPages[0],
							notifications: [notification, ...newPages[0].notifications].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
						};
					}

					return { ...oldData, pages: newPages };
				}
			);

			void queryClientRef.current.invalidateQueries({
				queryKey: ['activity-center', 'notification-message', notification.message._id],
			});
		};

		const handleRemovalEvent = ({ messageId }: { messageId: string }) => {
			queryClientRef.current.setQueryData(
				['activity-notifications', uid, filters, searchText],
				(oldData: any) => {
					if (!oldData || !oldData.pages) return oldData;
					const newPages = oldData.pages.map((page: any) => ({
						...page,
						notifications: page.notifications.filter((n: any) => n.message._id !== messageId),
					}));
					return { ...oldData, pages: newPages };
				}
			);
		};

		const unsub = notifyUserStream(`${uid}/activity-notification-add`, handleNotificationEvent);
		const unsubRemoval = notifyUserStream(`${uid}/activity-notification-removed`, handleRemovalEvent);
		const unsubUpdate = notifyUserStream(`${uid}/activity-notification-updated`, ({ messageId }: { messageId: string }) => {
			void queryClientRef.current.invalidateQueries({
				queryKey: ['activity-center', 'notification-message', messageId],
				exact: true,
			});
		});
		notificationUnsubscribersRef.current = [unsub, unsubRemoval, unsubUpdate];

		return cleanupNotificationSubscriptions;
	}, [uid, filters, searchText, notifyUserStream, cleanupNotificationSubscriptions]);

	useEffect(() => {
		if (!uid) {
			return;
		}

		let debounceTimeout: ReturnType<typeof setTimeout>;

		const unsub = subscribeToNotifyUser(`${uid}/subscriptions-changed`, () => {
			if (debounceTimeout) {
				clearTimeout(debounceTimeout);
			}
			debounceTimeout = setTimeout(() => {
				void queryClientRef.current.invalidateQueries({
					queryKey: ['activity-notifications', uid],
				});
			}, 1000); // 1-second debounce for bulk subscription changes
		});

		return () => {
			if (debounceTimeout) clearTimeout(debounceTimeout);
			unsub();
		};
	}, [uid, subscribeToNotifyUser]);

	const clearOne = useCallback(
		async (id: string) => {
			await deleteNotifications({ id });

			queryClient.setQueryData(['activity-notifications', uid, filters, searchText], (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				const newPages = oldData.pages.map((page: any) => ({
					...page,
					notifications: page.notifications.filter((n: any) => n._id !== id),
				}));
				return { ...oldData, pages: newPages };
			});
		},
		[deleteNotifications, queryClient, uid, filters, searchText]
	);

	const clearAll = useCallback(async () => {
		await deleteNotifications({});
		void queryClient.invalidateQueries({
			queryKey: ['activity-notifications', uid],
		});
	}, [deleteNotifications, queryClient, uid]);

	const getUnreadCount = useCallback(() => notifications.filter((n) => n.isUnread).length, [notifications]);

	return useMemo(
		() => ({
			notifications,
			isLoading,
			clearOne,
			clearAll,
			getUnreadCount,
			fetchNextPage,
			hasNextPage,
			isFetchingNextPage,
		}),
		[notifications, isLoading, clearOne, clearAll, getUnreadCount, fetchNextPage, hasNextPage, isFetchingNextPage]
	);
};
