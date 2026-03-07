import type { ReactElement } from 'react';
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
} from '@rocket.chat/fuselage';
import { useRouter } from '@rocket.chat/ui-contexts';
import { UserAvatar } from '@rocket.chat/ui-avatar';
import { useUserDisplayName } from '@rocket.chat/ui-client';
import { useTranslation } from 'react-i18next';
import { useFormatTime } from '/client/hooks/useFormatTime';
import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';
import MessageContentBody from '/client/components/message/MessageContentBody';
import type { MentionMessage } from '../../../hooks/useMentionsQuery';

type MentionItemProps = {
	message: MentionMessage;
	sequential: boolean;
};

const MentionItem = ({ message, sequential }: MentionItemProps): ReactElement => {
	const { t } = useTranslation();
	const router = useRouter();
	const formatTime = useFormatTime();
	const formatDateAndTime = useFormatDateAndTime();
	const displayName = useUserDisplayName({ name: message.u.name ?? '', username: message.u.username ?? '' });

	const handleJump = () => {
		router.navigate({
			name: message.roomType === 'd' ? 'direct' : 'channel',
			params: { rid: message.rid },
			search: { msg: message._id },
		});
	};

	return (
		<Message onClick={handleJump} style={{ cursor: 'pointer' }}>
			<MessageLeftContainer>{!sequential && <UserAvatar username={message.u.username ?? ''} size='x36' />}</MessageLeftContainer>
			<MessageContainer>
				{!sequential && (
					<MessageHeader>
						<MessageName>{displayName}</MessageName>
						<MessageTimestamp title={formatDateAndTime(message.ts)}>{formatTime(message.ts)}</MessageTimestamp>
					</MessageHeader>
				)}
				<MessageBody>
					{message.md ? <MessageContentBody md={message.md} mentions={message.mentions} channels={message.channels} /> : message.msg}
				</MessageBody>
			</MessageContainer>
			<MessageToolbarWrapper>
				<MessageToolbar>
					<MessageToolbarItem icon='jump' title={t('Jump_to_message')} onClick={handleJump} />
				</MessageToolbar>
			</MessageToolbarWrapper>
		</Message>
	);
};

export default MentionItem;
