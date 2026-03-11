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
import { UserAvatar } from '@rocket.chat/ui-avatar';
import { useUserDisplayName } from '@rocket.chat/ui-client';
import { useTranslation } from 'react-i18next';
import { useFormatTime } from '/client/hooks/useFormatTime';
import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';
import { onClientMessageReceived } from '/client/lib/onClientMessageReceived';
import { mapMessageFromApi } from '/client/lib/utils/mapMessageFromApi';
import RoomMessageContent from '/client/components/message/variants/room/RoomMessageContent';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import type { ActivityNotification } from '../../../hooks/useActivityNotifications';

type MentionItemProps = {
	notification: ActivityNotification;
	sequential: boolean;
	onClear: (id: string) => void;
};

const MentionItem = ({ notification, sequential, onClear }: MentionItemProps): ReactElement => {
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
		router.navigate({
			name: notification.roomType === 'd' ? 'direct' : notification.roomType === 'p' ? 'group' : 'channel',
			params: notification.roomType === 'd' ? { rid: notification.rid } : { name: notification.roomName || '' },
			search: { msg: notification.messageId },
		});
	};

	const handleClear = (e: MouseEvent): void => {
		e.stopPropagation();
		onClear(notification.id);
	};

	return (
		<Box opacity={notification.seen ? 0.7 : 1}>
			<Message
				onClick={handleJump}
				style={{
					cursor: 'pointer',
					fontWeight: notification.seen ? '400' : '600',
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
						</MessageHeader>
					)}
					<MessageBody>
						{hydratedMessage ? (
							<RoomMessageContent message={hydratedMessage} unread={false} mention={false} all={false} />
						) : (
							notification.text || notification.title
						)}
					</MessageBody>
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

export default MentionItem;
