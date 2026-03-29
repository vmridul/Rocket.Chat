import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEndpoint, useUserPreference } from '@rocket.chat/ui-contexts';
import { useUserDisplayName } from '@rocket.chat/ui-client';
import { useTranslation } from 'react-i18next';

import type { ActivityNotification } from '../../../hooks/useActivityNotifications';
import { useFormatTime } from '/client/hooks/useFormatTime';
import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';
import { onClientMessageReceived } from '/client/lib/onClientMessageReceived';
import { mapMessageFromApi } from '/client/lib/utils/mapMessageFromApi';
import { messageListContextDefaultValue } from '/client/components/message/list/MessageListContext';
import { getRegexHighlight, getRegexHighlightUrl } from '/app/highlight-words/client/helper';
import { getActivityMetaText } from '../lib/getActivityMetaTexts';
import { getActivityRoomIcon } from '../lib/getActivityRoomIcon';
import { getActivityTypeIcon } from '../lib/getActivityTypeIcon';

export const useActivityItemViewModel = (notification: ActivityNotification) => {
	const { t } = useTranslation();
	const getMessage = useEndpoint('GET', '/v1/chat.getMessage');
	const formatTime = useFormatTime();
	const formatDateAndTime = useFormatDateAndTime();

	const { data: hydratedMessage } = useQuery({
		queryKey: ['activity-center', 'notification-message', notification.message._id],
		queryFn: async () => {
			const { message: rawMessage } = await getMessage({ msgId: notification.message._id });
			const mappedMessage = mapMessageFromApi(rawMessage);
			return (await onClientMessageReceived(mappedMessage)) || mappedMessage;
		},
		retry: false,
	});

	const sender = {
		username: notification.sender.username ?? hydratedMessage?.u?.username ?? '',
		name: notification.sender.name ?? hydratedMessage?.u?.name ?? '',
	};

	const displayName = useUserDisplayName(sender);

	const rawHighlights = useUserPreference<string[]>('highlights');
	const highlights = useMemo(
		() =>
			rawHighlights
				?.map((str) => str.trim())
				.filter(Boolean)
				.map((highlight) => ({
					highlight,
					regex: getRegexHighlight(highlight),
					urlRegex: getRegexHighlightUrl(highlight),
				})),
		[rawHighlights],
	);
	const messageListContextValue = useMemo(() => ({ ...messageListContextDefaultValue, highlights }), [highlights]);
	const messageTime = hydratedMessage?.ts || notification.receivedAt;

	return {
		hydratedMessage,
		user: {
			username: sender.username,
			displayName,
		},
		time: {
			label: formatTime(messageTime),
			title: formatDateAndTime(messageTime),
		},
		content: {
			metaText: getActivityMetaText(notification, t),
			showRoomContext: notification.room.t !== 'd' || Boolean(notification.room.prid),
			isMentioned: notification.kind === 'mention' || notification.kind === 'highlight',
		},
		icons: {
			activity: getActivityTypeIcon(notification),
			room: getActivityRoomIcon(notification),
		},
		messageListContextValue,
		formatDateAndTime,
	};
};
