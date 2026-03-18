import type { MouseEvent, ReactElement } from 'react';
import {
	Box,
	Message,
	MessageContainer,
	MessageHeader,
	MessageLeftContainer,
	MessageName,
	MessageTimestamp,
	MessageToolbar,
	MessageToolbarItem,
	MessageToolbarWrapper,
} from '@rocket.chat/fuselage';
import { useRouter } from '@rocket.chat/ui-contexts';
import { RoomAvatar, UserAvatar } from '@rocket.chat/ui-avatar';
import { useUserDisplayName } from '@rocket.chat/ui-client';
import { useTranslation } from 'react-i18next';

import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';
import { useFormatTime } from '/client/hooks/useFormatTime';
import RoomMessageContent from '/client/components/message/variants/room/RoomMessageContent';

import type { MentionMessage } from '../../hooks/useMentionsQuery';

type MentionsMessageItemProps = {
	message: MentionMessage;
};

const MentionsMessageItem = ({ message }: MentionsMessageItemProps): ReactElement => {
	const { t } = useTranslation();
	const router = useRouter();
	const formatTime = useFormatTime();
	const formatDateAndTime = useFormatDateAndTime();

	const displayName = useUserDisplayName({
		name: message.u?.name ?? '',
		username: message.u?.username ?? '',
	});

	const handleJump = () => {
		router.navigate({
			name: message.roomType === 'd' ? 'direct' : message.roomType === 'p' ? 'group' : 'channel',
			params: message.roomType === 'd' ? { rid: message.rid } : { name: message.roomName || '' },
			search: { msg: message._id },
		});
	};

	const handleJumpFromToolbar = (e: MouseEvent): void => {
		e.stopPropagation();
		handleJump();
	};

	return (
		<Message onClick={handleJump} style={{ cursor: 'pointer' }}>
			<MessageLeftContainer>
				<UserAvatar username={message.u?.username ?? ''} size='x36' />
			</MessageLeftContainer>
			<MessageContainer>
				<MessageHeader>
					<MessageName>{displayName}</MessageName>
					<MessageTimestamp title={formatDateAndTime(message.ts)}>{formatTime(message.ts)}</MessageTimestamp>
					<Box display='inline-flex' alignItems='center' color='hint' mis={8}>
						{message.roomType === 'd' ? (
							<Box is='span' fontScale='c1'>
								{t('mentioned_you')}
							</Box>
						) : (
							<>
								<Box is='span' fontScale='c1' mie={6}>
									{t('mentioned_you_in')}
								</Box>
								<RoomAvatar size='x16' room={{ _id: message.rid, type: message.roomType || 'c' }} />
								<Box is='span' fontScale='c1' mis={4}>
									{`#${message.roomName || ''}`}
								</Box>
							</>
						)}
					</Box>
				</MessageHeader>
				<RoomMessageContent message={message} unread={false} mention all={false} showThreadMetrics />
			</MessageContainer>
			<MessageToolbarWrapper>
				<MessageToolbar>
					<MessageToolbarItem icon='jump' title={t('Jump_to_message')} onClick={handleJumpFromToolbar} />
				</MessageToolbar>
			</MessageToolbarWrapper>
		</Message>
	);
};

export default MentionsMessageItem;
