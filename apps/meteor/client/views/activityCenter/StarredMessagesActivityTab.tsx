import type { IMessage } from '@rocket.chat/core-typings';
import { useEndpoint, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import ActivityTab from './ActivityTab';
import { onClientMessageReceived } from '../../lib/onClientMessageReceived';
import { mapMessageFromApi } from '../../lib/utils/mapMessageFromApi';

const StarredMessagesActivityTab = (): ReactElement => {
	const getStarredMessages = useEndpoint('GET', '/v1/chat.getStarredMessages');
	const getSubscriptions = useEndpoint('GET', '/v1/subscriptions.get');
	const unstarMessage = useEndpoint('POST', '/v1/chat.unStarMessage');
	const { t } = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();

	const starredMessagesQueryResult = useQuery({
		queryKey: ['user', 'all-starred-messages'],

		queryFn: async () => {
			try {
				// Get all user subscriptions (rooms)
				const subscriptionsResult = await getSubscriptions({});

				// Extract room IDs from subscriptions
				const roomIds = (subscriptionsResult.update || []).map((sub: any) => sub.rid).filter(Boolean);

				if (roomIds.length === 0) {
					return [];
				}

				// Fetch starred messages from each room
				const allMessages: IMessage[] = [];

				for (const roomId of roomIds) {
					try {
						for (
							let offset = 0,
								result = await getStarredMessages({
									roomId,
									offset: 0,
								});
							result.count > 0;
							offset += result.count, result = await getStarredMessages({ roomId, offset })
						) {
							allMessages.push(...result.messages.map(mapMessageFromApi));
						}
					} catch (error) {
						// Skip rooms where we can't fetch starred messages (permission issues, etc)
						console.debug(`Failed to fetch starred messages for room ${roomId}:`, error);
					}
				}

				// Sort by timestamp (newest first) and remove duplicates
				const uniqueMessages = new Map<string, IMessage>();
				allMessages.forEach((msg) => {
					uniqueMessages.set(msg._id, msg);
				});

				const sortedMessages = Array.from(uniqueMessages.values()).sort((a, b) => {
					const timeA = typeof a.ts === 'number' ? a.ts : new Date(a.ts).getTime();
					const timeB = typeof b.ts === 'number' ? b.ts : new Date(b.ts).getTime();
					return timeB - timeA;
				});

				return Promise.all(sortedMessages.map(onClientMessageReceived));
			} catch (error) {
				console.error('Error fetching starred messages:', error);
				return [];
			}
		},

		staleTime: 0, // Immediately refetch on user interaction
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchOnWindowFocus: true, // Refetch when user returns to window
		refetchInterval: 30 * 1000, // Refetch every 30 seconds for live updates
	});

	// Mutation for unstarring a single message
	const unstarSingleMessage = useMutation({
		mutationFn: async (messageId: string) => {
			await unstarMessage({ messageId });
		},
		onSuccess: () => {
			dispatchToastMessage({ type: 'success', message: t('Message_has_been_unstarred') });
		},
		onError: (error) => {
			dispatchToastMessage({ type: 'error', message: String(error) });
		},
	});

	// Mutation for unstarring all messages
	const unstarAllMessages = useMutation({
		mutationFn: async () => {
			const messages = starredMessagesQueryResult.data || [];
			const errors = [];

			for (const message of messages) {
				try {
					await unstarMessage({ messageId: message._id });
				} catch (error) {
					errors.push(error);
					console.error(`Failed to unstar message ${message._id}:`, error);
				}
			}

			if (errors.length > 0) {
				throw new Error(t('Activity_Center_Clear_Partial_Error'));
			}
		},
		onSuccess: () => {
			dispatchToastMessage({ type: 'success', message: t('All_starred_messages_removed') });
		},
		onError: (error) => {
			dispatchToastMessage({ type: 'error', message: String(error) });
		},
	});

	const handleUnstarMessage = async (messageId: string) => {
		await unstarSingleMessage.mutateAsync(messageId);
		// Refetch after unstar
		await starredMessagesQueryResult.refetch();
	};

	const handleClearHistory = async () => {
		await unstarAllMessages.mutateAsync();
		// Refetch after clearing
		await starredMessagesQueryResult.refetch();
	};

	return (
		<ActivityTab
			iconName='star'
			title={t('Starred_Messages')}
			emptyResultMessage={t('No_starred_messages')}
			context='starred'
			queryResult={starredMessagesQueryResult}
			onUnstarMessage={handleUnstarMessage}
			onClearHistory={handleClearHistory}
		/>
	);
};

export default StarredMessagesActivityTab;
