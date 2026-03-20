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
} from '@rocket.chat/fuselage';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@rocket.chat/ui-contexts';
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
	let roomLabel = notification.roomType === 'd' ? notification.roomName || t('Direct_Message') : `#${notification.roomName || ''}`;

	if (notification.isDiscussion) {
		metaActionText = notification.isDiscussionReply ? 'new message in' : 'new discussion created';
		roomLabel = notification.roomName || '';
	}

	const handleJump = () => {
		void goToRoomById(notification.rid, { queryParamsOverrides: { msg: notification.messageId } });
	};

	const handleClear = (e: MouseEvent): void => {
		e.stopPropagation();
		onClear(notification._id);
	};

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
									<Box is='span' fontScale='c1' mis={4} style={readMetaTextStyle}>
										{roomLabel}
									</Box>
								</Box>
							)}
						</MessageHeader>
					)}
					{hydratedMessage ? (
						<RoomMessageContent message={hydratedMessage} unread={false} mention={false} all={false} showThreadMetrics />
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
