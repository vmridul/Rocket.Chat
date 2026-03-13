import type { ReactElement, Key } from 'react';
import { useMemo, useState } from 'react';
import { Box, MessageDivider, Button, Select } from '@rocket.chat/fuselage';
import { ContextualbarEmptyContent, VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';

import FilterByText from '/client/components/FilterByText';
import { useFormatDate } from '/client/hooks/useFormatDate';

import { useActivityNotifications } from '../../hooks/useActivityNotifications';
import ActivityItem from './AllActivtyItem';

type RoomTypeFilter = 'all' | 'c' | 'p' | 'd';

const AllActivityList = (): ReactElement => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const { notifications, clearOne, clearAll } = useActivityNotifications();
	const [searchText, setSearchText] = useState('');
	const [roomTypeFilter, setRoomTypeFilter] = useState<RoomTypeFilter>('all');
	const normalizedSearch = searchText.toLowerCase();

	const roomTypeOptions: [RoomTypeFilter, string][] = useMemo(
		() => [
			['all', t('All')],
			['c', t('Channels')],
			['p', t('Private_Groups')],
			['d', t('Direct_Messages')],
		],
		[t],
	);

	const isNewDay = (receivedAt: Date | string, previousReceivedAt?: Date | string): boolean => {
		if (!previousReceivedAt) {
			return true;
		}

		return new Date(receivedAt).toDateString() !== new Date(previousReceivedAt).toDateString();
	};

	const filteredNotifications = useMemo(
		() =>
			notifications.filter((notification) => {
				const matchesSearch = (notification.text || '').toLowerCase().includes(normalizedSearch);
				const matchesRoomType = roomTypeFilter === 'all' || notification.roomType === roomTypeFilter;

				return matchesSearch && matchesRoomType;
			}),
		[notifications, normalizedSearch, roomTypeFilter],
	);

	return (
		<Box height='100%' display='flex' flexDirection='column'>
			<Box display='flex' alignItems='center' paddingInline={16} paddingBlock={8} width='full'>
				<Box flexGrow={1} mie={8}>
					<FilterByText placeholder={t('Search')} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
				</Box>

				<Box mie={8}>
					<Select
						aria-label={t('Filter_By_Type')}
						options={roomTypeOptions}
						value={roomTypeFilter}
						onChange={(value: Key) => setRoomTypeFilter(value as RoomTypeFilter)}
					/>
				</Box>
				{/* Add confirmation dialog!!  */}
				<Button height='x40' minWidth='x100' onClick={clearAll} disabled={notifications.length === 0}>
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
