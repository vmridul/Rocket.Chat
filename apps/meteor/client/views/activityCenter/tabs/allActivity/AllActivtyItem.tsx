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
import { Meteor } from 'meteor/meteor';
import { useTranslation } from 'react-i18next';
import { useFormatTime } from '/client/hooks/useFormatTime';
import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';
import { onClientMessageReceived } from '/client/lib/onClientMessageReceived';
import { mapMessageFromApi } from '/client/lib/utils/mapMessageFromApi';
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

	const displayName = useUserDisplayName({
		name: hydratedMessage?.u?.name ?? notification.sender.name ?? '',
		username: hydratedMessage?.u?.username ?? notification.sender.username ?? '',
	});

	const messageTime = useMemo(() => hydratedMessage?.ts || notification.receivedAt, [hydratedMessage?.ts, notification.receivedAt]);

	const handleJump = () => {
		if (!notification.seen) {
			void Meteor.callAsync('activityNotifications:markAsSeen', notification._id);
		}

		router.navigate({
			name: notification.roomType === 'd' ? 'direct' : notification.roomType === 'p' ? 'group' : 'channel',
			params: notification.roomType === 'd' ? { rid: notification.rid } : { name: notification.roomName || '' },
			search: { msg: notification.messageId },
		});
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
				<MessageLeftContainer>
					{!sequential && <UserAvatar username={notification.sender.username ?? ''} size='x36' />}
				</MessageLeftContainer>
				<MessageContainer>
					{!sequential && (
						<MessageHeader>
							<MessageName>{displayName}</MessageName>
							<MessageTimestamp title={formatDateAndTime(messageTime)}>{formatTime(messageTime)}</MessageTimestamp>
							{notification.roomType !== 'd' && (
								<Box display='inline-flex' alignItems='center' color='hint' mis={8}>
									<Box is='span' fontScale='c1' mie={6}>
										{t('sent_a_message_in')}
									</Box>
									<RoomAvatar size='x16' room={{ _id: notification.rid, type: notification.roomType || 'c' }} />
									<Box is='span' fontScale='c1' mis={4}>
										{`#${notification.roomName || ''}`}
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
