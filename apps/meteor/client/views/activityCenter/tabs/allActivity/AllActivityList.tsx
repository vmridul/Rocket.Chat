import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Box, MessageDivider, Button } from '@rocket.chat/fuselage';
import { ContextualbarEmptyContent, VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';

import FilterByText from '/client/components/FilterByText';
import { useFormatDate } from '/client/hooks/useFormatDate';

import { useActivityNotifications } from '../../hooks/useActivityNotifications';
import ActivityItem from './AllActivtyItem';

const AllActivityList = (): ReactElement => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const { notifications, clearOne, clearAll } = useActivityNotifications();
	const [searchText, setSearchText] = useState('');
	const normalizedSearch = searchText.toLowerCase();

	const isNewDay = (receivedAt: Date | string, previousReceivedAt?: Date | string): boolean => {
		if (!previousReceivedAt) {
			return true;
		}

		return new Date(receivedAt).toDateString() !== new Date(previousReceivedAt).toDateString();
	};

	const filteredNotifications = useMemo(
		() => notifications.filter((notification) => (notification.text || '').toLowerCase().includes(normalizedSearch)),
		[notifications, normalizedSearch],
	);

	return (
		<Box height='100%' display='flex' flexDirection='column'>
			<Box display='flex' justifyContent='space-between' alignItems='center' paddingInline={16} paddingBlock={8}>
				<Box paddingInline={16}>
					<FilterByText placeholder={t('Search')} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
				</Box>
				<Button small onClick={clearAll} disabled={notifications.length === 0}>
					Clear all
				</Button>
			</Box>

			{filteredNotifications.length === 0 && <ContextualbarEmptyContent title={t('No Notifications')} />}

			{filteredNotifications.length > 0 && (
				<Box flexGrow={1} minHeight={0}>
					<VirtualizedScrollbars>
						<Virtuoso
							data={filteredNotifications}
							overscan={25}
							itemContent={(index, notification) => {
								const previous = filteredNotifications[index - 1];
								const newDay = isNewDay(notification.receivedAt, previous?.receivedAt);

								return (
									<>
										{newDay && <MessageDivider>{formatDate(new Date(notification.receivedAt))}</MessageDivider>}
										<ActivityItem notification={notification} sequential={false} onClear={clearOne} />
									</>
								);
							}}
						/>
					</VirtualizedScrollbars>
				</Box>
			)}
		</Box>
	);
};

export default AllActivityList;
