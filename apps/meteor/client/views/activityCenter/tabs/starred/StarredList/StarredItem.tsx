import type { MouseEvent, ReactElement } from 'react';
import { useState } from 'react';
import {
	Box,
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader,
	MessageBody,
	MessageName,
	MessageStatusIndicator,
	MessageStatusIndicatorItem,
	MessageTimestamp,
	MessageToolbar,
	MessageToolbarItem,
	MessageToolbarWrapper,
} from '@rocket.chat/fuselage';
import type { GenericMenuItemProps } from '@rocket.chat/ui-client';
import { GenericMenu } from '@rocket.chat/ui-client';
import { useRouter, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import { useTranslation } from 'react-i18next';

import { RoomAvatar, UserAvatar } from '@rocket.chat/ui-avatar';
import { useUserDisplayName } from '@rocket.chat/ui-client';

import { useFormatTime } from '/client/hooks/useFormatTime';
import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';
import { useUnstarMessageMutation } from '/client/components/message/hooks/useUnstarMessageMutation';
import { getPermaLink } from '/client/lib/getPermaLink';

import RoomMessageContent from '/client/components/message/variants/room/RoomMessageContent';

import type { StarredMessage } from '../../../hooks/useStarredQuery';

type Props = {
	message: StarredMessage;
	onUnstar: (messageId: string) => void;
};

const StarredItem = ({ message, onUnstar }: Props): ReactElement => {
	const { t } = useTranslation();
	const router = useRouter();
	const dispatchToastMessage = useToastMessageDispatch();
	const formatTime = useFormatTime();
	const formatDateAndTime = useFormatDateAndTime();
	const { mutateAsync: unstarMessage, isPending: isUnstarring } = useUnstarMessageMutation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const displayName = useUserDisplayName({
		name: message.u?.name ?? '',
		username: message.u?.username ?? '',
	});

	const handleJump = (): void => {
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

	const handleUnstar = async (): Promise<void> => {
		await unstarMessage(message);
		onUnstar(message._id);
	};

	const handleCopyLink = async (): Promise<void> => {
		try {
			const permalink = await getPermaLink(message._id);
			navigator.clipboard.writeText(permalink);
			dispatchToastMessage({ type: 'success', message: t('Copied') });
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	};

	const menuItems: GenericMenuItemProps[] = [
		{
			id: 'unstar-message',
			icon: 'star',
			content: t('Unstar_Message'),
			onClick: handleUnstar,
			disabled: isUnstarring,
		},
		{
			id: 'copy-link',
			icon: 'permalink',
			content: t('Copy_link'),
			onClick: handleCopyLink,
		},
	];

	return (
		<Message onClick={handleJump} style={{ cursor: 'pointer' }}>
			<MessageLeftContainer>
				<UserAvatar username={message.u?.username ?? ''} size='x36' />
			</MessageLeftContainer>

			<MessageContainer>
				<MessageHeader>
					<MessageName>{displayName}</MessageName>

					<MessageTimestamp title={formatDateAndTime(message.ts)}>{formatTime(message.ts)}</MessageTimestamp>
					<MessageStatusIndicator>
						<MessageStatusIndicatorItem name='star-filled' title={t('Message_has_been_starred')} />
					</MessageStatusIndicator>
					<Box display='inline-flex' alignItems='center' color='hint' mis={8}>
						<RoomAvatar size='x16' room={{ _id: message.rid, type: message.roomType || 'c' }} />
						<Box is='span' fontScale='c1' mis={4}>
							{message.roomType === 'd' ? message.roomName || t('Direct_Messages') : `#${message.roomName || ''}`}
						</Box>
					</Box>
				</MessageHeader>

				<MessageBody>
					<RoomMessageContent message={message} unread={false} mention={false} all={false} />
				</MessageBody>
			</MessageContainer>
			<MessageToolbarWrapper visible={isMenuOpen}>
				<MessageToolbar>
					<MessageToolbarItem icon='jump' title={t('Jump_to_message')} onClick={handleJumpFromToolbar} />
					<Box onClick={(e: MouseEvent) => e.stopPropagation()}>
						<GenericMenu title={t('More')} items={menuItems} icon='kebab' placement='bottom-end' detached onOpenChange={setIsMenuOpen} />
					</Box>
				</MessageToolbar>
			</MessageToolbarWrapper>
		</Message>
	);
};

export default StarredItem;
