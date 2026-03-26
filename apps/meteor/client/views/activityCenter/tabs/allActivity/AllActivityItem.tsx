import type { MouseEvent, ReactElement } from 'react';
import { useMemo } from 'react';
import {
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader,
	MessageTimestamp,
	MessageName,
	MessageBody,
	MessageToolbar,
	MessageToolbarItem,
	MessageToolbarWrapper,
	Box,
	Icon,
} from '@rocket.chat/fuselage';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useUserPreference } from '@rocket.chat/ui-contexts';
import { RoomAvatar, UserAvatar } from '@rocket.chat/ui-avatar';
import { useUserDisplayName } from '@rocket.chat/ui-client';
import { useTranslation } from 'react-i18next';
import { useFormatTime } from '/client/hooks/useFormatTime';
import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';
import { onClientMessageReceived } from '/client/lib/onClientMessageReceived';
import { mapMessageFromApi } from '/client/lib/utils/mapMessageFromApi';
import { goToRoomById } from '/client/lib/utils/goToRoomById';
import RoomMessageContent from '/client/components/message/variants/room/RoomMessageContent';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import type { ActivityNotification } from '../../hooks/useActivityNotifications';
import { MessageListContext, messageListContextDefaultValue } from '/client/components/message/list/MessageListContext';
import { getRegexHighlight, getRegexHighlightUrl } from '/app/highlight-words/client/helper';

type ActivityItemProps = {
	notification: ActivityNotification;
	sequential: boolean;
	onClear: (id: string) => void;
};

const ActivityItem = ({ notification, sequential, onClear }: ActivityItemProps): ReactElement => {
	const { t } = useTranslation();
	const router = useRouter();
	const getMessage = useEndpoint('GET', '/v1/chat.getMessage');
	const formatTime = useFormatTime();
	const formatDateAndTime = useFormatDateAndTime();

	const { data: hydratedMessage } = useQuery({
		queryKey: ['activity-center', 'notification-message', notification.messageId],
		queryFn: async () => {
			const { message: rawMessage } = await getMessage({ msgId: notification.messageId });
			const mappedMessage = mapMessageFromApi(rawMessage);
			return (await onClientMessageReceived(mappedMessage)) || mappedMessage;
		},
		retry: false,
	});

	const actorUsername = notification.sender.username ?? hydratedMessage?.u?.username ?? '';
	const actorName = notification.sender.name ?? hydratedMessage?.u?.name ?? '';

	const displayName = useUserDisplayName({
		name: actorName,
		username: actorUsername,
	});

	const messageTime = useMemo(() => hydratedMessage?.ts || notification.receivedAt, [hydratedMessage?.ts, notification.receivedAt]);
	const readMetaTextStyle = !notification.isUnread ? { opacity: 0.7 } : undefined;

	let metaActionText = notification.isThreadReply ? 'new reply in thread in' : t('sent_a_message_in');
	let metaActionTextDm = notification.isThreadReply ? 'new reply in thread' : t('sent_you_a_message');
	if (notification.isDiscussion) {
		metaActionText = notification.isDiscussionReply ? 'new message in' : 'new discussion created';
	}

	if (notification.type === 'mention' || notification.type === 'highlight') {
		metaActionText = notification.isThreadReply ? 'mentioned you in a thread in' : 'mentioned you in';
		metaActionTextDm = notification.isThreadReply ? 'mentioned you in a thread' : 'mentioned you';
	} else if (notification.type === 'reaction') {
		metaActionText = 'new reaction to your message in';
		metaActionTextDm = 'new reaction to your message';
	}

	const handleJump = () => {
		void goToRoomById(notification.rid, { queryParamsOverrides: { msg: notification.messageId } });
	};

	const handleClear = (e: MouseEvent): void => {
		e.stopPropagation();
		onClear(notification._id);
	};

	const isMentionOrHighlight = notification.type === 'mention' || notification.type === 'highlight';

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

	const messageListContextValue = useMemo(
		() => ({ ...messageListContextDefaultValue, highlights }),
		[highlights],
	);

	return (
		<Box>
			<Message
				onClick={handleJump}
				style={{
					cursor: 'pointer',
				}}
			>
				<MessageLeftContainer>{!sequential && <UserAvatar username={actorUsername} size='x36' />}</MessageLeftContainer>
				<MessageContainer>
					{!sequential && (
						<MessageHeader>
							<MessageName>{displayName}</MessageName>
							<MessageTimestamp title={formatDateAndTime(messageTime)}>{formatTime(messageTime)}</MessageTimestamp>
							{notification.roomType === 'd' && !notification.isDiscussion && (
								<Box is='span' fontScale='c1' mis={6} color='hint' style={readMetaTextStyle}>
									{metaActionTextDm}
								</Box>
							)}
							{(notification.roomType !== 'd' || notification.isDiscussion) && (
								<Box display='inline-flex' alignItems='center' color='hint' mis={8}>
									<Box is='span' fontScale='c1' mie={6} style={readMetaTextStyle}>
										{metaActionText}
									</Box>
									<RoomAvatar size='x16' room={{ _id: notification.rid, type: notification.roomType || 'c' }} />
									<Box is='span' fontScale='c1' mis={4} display='inline-flex' alignItems='center' style={readMetaTextStyle}>
										{notification.isDiscussion ? (
											<Icon name='baloons' size='x16' mie={4} />
										) : notification.isTeam ? (
											<Icon name={notification.roomType === 'p' ? 'team-lock' : 'team'} size='x16' mie={4} />
										) : (
											notification.roomType !== 'd' && <Icon name={notification.roomType === 'p' ? 'hashtag-lock' : 'hash'} size='x16' mie={4} />
										)}
										{notification.roomName || (notification.roomType === 'd' ? t('Direct_Message') : '')}
									</Box>
								</Box>
							)}
						</MessageHeader>
					)}
					{hydratedMessage ? (
						<MessageListContext.Provider value={messageListContextValue}>
							<RoomMessageContent message={hydratedMessage} unread={false} mention={isMentionOrHighlight} all={false} showThreadMetrics />
						</MessageListContext.Provider>
					) : (
						<MessageBody>{notification.text}</MessageBody>
					)}
				</MessageContainer>
				<MessageToolbarWrapper>
					<MessageToolbar>
						<MessageToolbarItem icon='jump' title={t('Jump_to_message')} onClick={handleJump} />
						<MessageToolbarItem icon='cross' title={t('Dismiss')} onClick={handleClear} />
					</MessageToolbar>
				</MessageToolbarWrapper>
			</Message>
		</Box>
	);
};

export default ActivityItem;
