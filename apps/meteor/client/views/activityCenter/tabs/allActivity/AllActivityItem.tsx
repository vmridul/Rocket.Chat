import type { MouseEvent, ReactElement } from 'react';
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
import { RoomAvatar, UserAvatar } from '@rocket.chat/ui-avatar';
import { useTranslation } from 'react-i18next';
import { goToRoomById } from '/client/lib/utils/goToRoomById';
import RoomMessageContent from '/client/components/message/variants/room/RoomMessageContent';
import type { ActivityNotification } from '../../hooks/useActivityNotifications';
import { MessageListContext } from '/client/components/message/list/MessageListContext';
import { useActivityItemViewModel } from './hooks/useActivityItemViewModel';

type ActivityItemProps = {
	notification: ActivityNotification;
	sequential: boolean;
	onClear: (id: string) => void;
};

type EditedMessage = {
	editedAt?: Date;
};

const hasEditedAt = (message: unknown): message is EditedMessage =>
	Boolean(message && typeof message === 'object' && 'editedAt' in message);

const ActivityItem = ({ notification, sequential, onClear }: ActivityItemProps): ReactElement => {
	const { t } = useTranslation();
	const {
		hydratedMessage,
		user,
		time,
		content,
		icons,
		messageListContextValue,
		formatDateAndTime,
	} = useActivityItemViewModel(notification);
	const readMetaTextStyle = !notification.isUnread ? { opacity: 0.7 } : undefined;

	const handleJump = () => {
		void goToRoomById(notification.room._id, { queryParamsOverrides: { msg: notification.message._id } });
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
				<MessageLeftContainer>{!sequential && <UserAvatar username={user.username} size='x36' />}</MessageLeftContainer>
				<MessageContainer>
					{!sequential && (
						<MessageHeader>
							<MessageName>{user.displayName}</MessageName>
							<MessageTimestamp title={time.title}>{time.label}</MessageTimestamp>
							{hasEditedAt(hydratedMessage) && hydratedMessage.editedAt && (
								<Box
									is='span'
									display='inline-flex'
									alignItems='center'
									mis={1}
									color='hint'
									title={t('Message_has_been_edited_at', { date: formatDateAndTime(hydratedMessage.editedAt) })}
									style={readMetaTextStyle}
								>
									<Icon name='edit' size='x16' />
								</Box>
							)}
							<Box is='span' display='inline-flex' alignItems='center' mis={2} color='hint' style={readMetaTextStyle}>
								<Icon name={icons.activity} size='x16' />
							</Box>
							{!content.showRoomContext && (
								<Box is='span' fontScale='c1' mis={1} color='hint' style={readMetaTextStyle}>
									{content.metaText}
								</Box>
							)}
							{content.showRoomContext && (
								<Box display='inline-flex' alignItems='center' color='hint' mis={2}>
									<Box is='span' fontScale='c1' mie={6} style={readMetaTextStyle}>
										{content.metaText}
									</Box>
									<RoomAvatar size='x16' room={{ _id: notification.room._id, type: notification.room.t }} />
									<Box is='span' fontScale='c1' mis={4} display='inline-flex' alignItems='center' style={readMetaTextStyle}>
										{notification.room.t !== 'd' && <Icon name={icons.room} size='x16' mie={1} />}
										{notification.room.name || (notification.room.t === 'd' ? t('Direct_Message') : '')}
									</Box>
								</Box>
							)}
						</MessageHeader>
					)}
					{hydratedMessage ? (
						<MessageListContext.Provider value={messageListContextValue}>
							<RoomMessageContent message={hydratedMessage} unread={false} mention={content.isMentioned} all={false} showThreadMetrics />
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
