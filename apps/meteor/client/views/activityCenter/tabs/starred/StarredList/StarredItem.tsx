import type { ReactElement } from 'react';
import {
	Message,
	MessageLeftContainer,
	MessageContainer,
	MessageHeader,
	MessageBody,
	MessageName,
	MessageTimestamp,
} from '@rocket.chat/fuselage';

import { UserAvatar } from '@rocket.chat/ui-avatar';
import { useUserDisplayName } from '@rocket.chat/ui-client';

import { useFormatTime } from '/client/hooks/useFormatTime';
import { useFormatDateAndTime } from '/client/hooks/useFormatDateAndTime';

import RoomMessageContent from '/client/components/message/variants/room/RoomMessageContent';

import type { StarredMessage } from '../../../hooks/useStarredQuery';

type Props = {
	message: StarredMessage;
};

const StarredItem = ({ message }: Props): ReactElement => {
	const formatTime = useFormatTime();
	const formatDateAndTime = useFormatDateAndTime();

	const displayName = useUserDisplayName({
		name: message.u?.name ?? '',
		username: message.u?.username ?? '',
	});

	return (
		<Message>
			<MessageLeftContainer>
				<UserAvatar username={message.u?.username ?? ''} size='x36' />
			</MessageLeftContainer>

			<MessageContainer>
				<MessageHeader>
					<MessageName>{displayName}</MessageName>

					<MessageTimestamp title={formatDateAndTime(message.ts)}>{formatTime(message.ts)}</MessageTimestamp>
				</MessageHeader>

				<MessageBody>
					<RoomMessageContent message={message} unread={false} mention={false} all={false} />
				</MessageBody>
			</MessageContainer>
		</Message>
	);
};

export default StarredItem;
