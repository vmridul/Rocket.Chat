import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Bubble, MessageDivider, ContextualbarEmptyContent, Button, Badge } from '@rocket.chat/fuselage';
import MentionItem from './MentionItem';
import { useActivityNotifications } from '../../../hooks/useActivityNotifications';

const formatDate = (date: Date | string): string => new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(date));

const MentionsList = (): ReactElement => {
	const { t } = useTranslation();
	const { notifications, clearOne, clearAll, getUnreadCount } = useActivityNotifications();
	const unreadCount = getUnreadCount();

	return (
		<Box overflowY='auto' height='100%'>
			<Box display='flex' justifyContent='space-between' alignItems='center' paddingInline={16} paddingBlock={8}>
				<Box display='flex' alignItems='center'>
					<span>{t('All_notifications')}</span>
					{unreadCount > 0 && (
						<Box marginInlineStart='x8'>
							<Badge variant='primary'>{unreadCount}</Badge>
						</Box>
					)}
				</Box>
				<Button small onClick={clearAll} disabled={notifications.length === 0}>
					Clear all
				</Button>
			</Box>
			{notifications.length === 0 && <ContextualbarEmptyContent title={t('No_mentions')} />}
			{notifications.map((notification, index) => {
				const previous = notifications[index - 1];
				const sequential = !!previous && previous.rid === notification.rid;
				const newDay = !previous || new Date(notification.receivedAt).toDateString() !== new Date(previous.receivedAt).toDateString();

				return (
					<Box key={notification.id}>
						{newDay && (
							<MessageDivider>
								<Bubble small secondary>
									{formatDate(notification.receivedAt)}
								</Bubble>
							</MessageDivider>
						)}
						<MentionItem notification={notification} sequential={sequential} onClear={clearOne} />
					</Box>
				);
			})}
		</Box>
	);
};

export default MentionsList;
