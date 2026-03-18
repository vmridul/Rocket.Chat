import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Box, MessageDivider, Button } from '@rocket.chat/fuselage';
import { ContextualbarEmptyContent, GenericModal, VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useSetModal } from '@rocket.chat/ui-contexts';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';

import FilterByText from '/client/components/FilterByText';
import { useFormatDate } from '/client/hooks/useFormatDate';

import { useActivityNotifications } from '../../hooks/useActivityNotifications';
import { useActivityCenterContext } from '../../contexts/ActivityCenterContext';
import ActivityItem from './AllActivtyItem';

const AllActivityList = (): ReactElement => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const { notifications, clearOne, clearAll } = useActivityNotifications();
	const { filtersQuery, setIsFiltersOpen, hasAppliedFilters } = useActivityCenterContext();
	const setModal = useSetModal();
	const [searchText, setSearchText] = useState('');
	const normalizedSearch = searchText.toLowerCase();

	const handleClearAll = (): void => {
		const closeModal = (): void => setModal(null);

		const onConfirm = async (): Promise<void> => {
			await clearAll();
			closeModal();
		};

		setModal(
			<GenericModal
				title={t('Clear_all')}
				variant='warning'
				confirmText={t('Yes_clear_all')}
				onConfirm={onConfirm}
				onCancel={closeModal}
				onClose={closeModal}
			>
				{t('Are_you_sure_you_want_to_clear_all_notifications')}
			</GenericModal>,
		);
	};

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
				const matchesRoomType = filtersQuery.roomType === 'all' || notification.roomType === filtersQuery.roomType;
				const selectedUsernames = filtersQuery.usernames || [];
				const selectedRoomIds = filtersQuery.roomIds || [];
				const matchesUsername = selectedUsernames.length === 0 || selectedUsernames.includes(notification.sender.username || '');
				const matchesRoom = selectedRoomIds.length === 0 || selectedRoomIds.includes(notification.rid);

				let matchesDate = true;
				if (filtersQuery.fromDate || filtersQuery.toDate) {
					const notificationDate = new Date(notification.receivedAt).toDateString();
					if (filtersQuery.fromDate) {
						const fromDate = new Date(filtersQuery.fromDate).toDateString();
						matchesDate = matchesDate && notificationDate >= fromDate;
					}
					if (filtersQuery.toDate) {
						const toDate = new Date(filtersQuery.toDate).toDateString();
						matchesDate = matchesDate && notificationDate <= toDate;
					}
				}

				return matchesSearch && matchesRoomType && matchesUsername && matchesRoom && matchesDate;
			}),
		[notifications, normalizedSearch, filtersQuery],
	);

	return (
		<Box height='100%' display='flex' flexDirection='column'>
			<Box display='flex' alignItems='center' paddingInline={16} paddingBlock={8} width='full'>
				<Box flexGrow={1} mie={8}>
					<FilterByText placeholder={t('Search')} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
				</Box>

				<Button
					icon='customize'
					onClick={() => setIsFiltersOpen(true)}
					color={hasAppliedFilters ? 'status-font-on-success' : undefined}
					mie={8}
				>
					{t('Filters')}
				</Button>

				<Button height='x40' minWidth='x100' onClick={handleClearAll} disabled={notifications.length === 0}>
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
