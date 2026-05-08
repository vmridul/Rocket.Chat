import type { MouseEvent, ReactElement } from 'react';
import {
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader,
	MessageTimestamp,
	MessageToolbar,
	MessageToolbarItem,
	MessageToolbarWrapper,
	Box,
	Icon,
} from '@rocket.chat/fuselage';
import { RoomAvatar, UserAvatar } from '@rocket.chat/ui-avatar';
import { useTranslation } from 'react-i18next';
import { goToRoomById } from '/client/lib/utils/goToRoomById';
import type { ActivityNotification } from '../../hooks/useActivityNotifications';
import { RoomIcon } from '../../../../components/RoomIcon';
import { useActivityItemViewModel } from './hooks/useActivityItemViewModel';
import Emoji from '../../../../components/Emoji';
import RoomMessageContent from '/client/components/message/variants/room/RoomMessageContent';

type ActivityItemProps = {
	notification: ActivityNotification;
	sequential?: boolean;
	onClear: (id: string) => void;
};

type EditedMessage = {
	editedAt?: Date;
};

const hasEditedAt = (message: unknown): message is EditedMessage =>
	Boolean(message && typeof message === 'object' && 'editedAt' in message);

const ActivityItem = ({ notification, onClear }: ActivityItemProps): ReactElement => {
	const { t } = useTranslation();
	const {
		hydratedMessage,
		user,
		time,
		content,
		icons,
		tmid,
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
				<MessageLeftContainer>
					<RoomAvatar size='x40' room={{ _id: notification.room._id, type: notification.room.t }} />
				</MessageLeftContainer>
				<MessageContainer>
					<MessageHeader>
						<Box display='flex' alignItems='center' flexGrow={1} withTruncatedText>
							{notification.room.t !== 'd' && <RoomIcon room={notification.room as any} size='x18' />}
							<Box fontScale='p2m' mi={4} withTruncatedText>
								{notification.room.name || (notification.room.t === 'd' ? t('Direct_Message') : '')}
							</Box>

							<Box display='flex' alignItems='center' fontScale='c1' color='hint' mis={4} withTruncatedText style={readMetaTextStyle}>
								{notification.room.t !== 'd' && (
									<>
										<Box mie={4} display='flex' alignItems='center'>
											<UserAvatar username={user.username} size='x16' />
										</Box>
										<Box is='span' fontWeight={700} mie={4}>
											{user.displayName}
										</Box>
									</>
								)}
								<Box is='span' mie={4} withTruncatedText>
									{content.metaText}
								</Box>
								{notification.kind === 'reaction' && notification.emoji && (
									<Box is='span' display='inline-flex' alignItems='center' mie={4} size='x18'>
										<Emoji emojiHandle={notification.emoji} fillContainer />
									</Box>
								)}

								{tmid && (
									<>
										<Box is='span' display='inline-flex' alignItems='center' mie={4} color='font-info'>
											<Icon name='thread' size='x16' />
										</Box>
										<Box is='span' withTruncatedText mie={4} title={notification.parentMsg} color='font-info'>
											{notification.parentMsg || t('Message_not_found')}
										</Box>
									</>
								)}

								{hasEditedAt(hydratedMessage) && hydratedMessage.editedAt && (
									<Box
										is='span'
										display='inline-flex'
										alignItems='center'
										mie={4}
										color='hint'
										title={t('Message_has_been_edited_at', { date: formatDateAndTime(hydratedMessage.editedAt) })}
									>
										<Icon name='edit' size='x16' />
									</Box>
								)}
								{!tmid && !['message', 'emoji', 'discussion'].includes(icons.activity) && (
									<Box is='span' display='inline-flex' alignItems='center' mie={4} color='hint'>
										<Icon name={icons.activity} size='x16' />
									</Box>
								)}
							</Box>
						</Box>
						<MessageTimestamp title={time.title}>{time.label}</MessageTimestamp>
					</MessageHeader>
				{hydratedMessage ? (
					<RoomMessageContent message={hydratedMessage} unread={false} mention={false} all={false} />
				) : (
					<Box withTruncatedText color='default' fontScale='p2' is='div' mb={4}>
						{notification.text}
					</Box>
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
