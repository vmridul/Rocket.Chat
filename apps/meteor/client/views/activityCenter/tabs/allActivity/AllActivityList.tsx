import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Box, MessageDivider, Button } from '@rocket.chat/fuselage';
import { ContextualbarEmptyContent, GenericModal, VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { useSetModal } from '@rocket.chat/ui-contexts';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@rocket.chat/fuselage-hooks';

import FilterByText from '/client/components/FilterByText';
import { useFormatDate } from '/client/hooks/useFormatDate';

import { useActivityNotifications } from '../../hooks/useActivityNotifications';
import { useActivityCenterContext } from '../../contexts/ActivityCenterContext';
import ActivityItem from './AllActivityItem';
import debounce from 'lodash.debounce';

let lastScrollOffset = 0;

const AllActivityList = (): ReactElement => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const setModal = useSetModal();
	const { filtersQuery, setIsFiltersOpen, hasAppliedFilters } = useActivityCenterContext();
	const [searchText, setSearchText] = useState('');
	const debouncedSearchText = useDebouncedValue(searchText, 400);

	const {
		notifications,
		clearOne,
		clearAll,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useActivityNotifications(filtersQuery, debouncedSearchText);

	const setScrollOffsetDebounced = useMemo(
		() =>
			debounce((offset: number) => {
				lastScrollOffset = offset;
			}, 300),
		[],
	);

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

	const countsByDate = useMemo(() => {
		const counts = new Map<string, number>();
		notifications.forEach((notification) => {
			const dateKey = new Date(notification.receivedAt).toDateString();
			counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
		});
		return counts;
	}, [notifications]);

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

			{notifications.length === 0 && <ContextualbarEmptyContent title={t('No Notifications')} />}

			{notifications.length > 0 && (
				<Box flexGrow={1} minHeight={0}>
					<VirtualizedScrollbars>
						<Virtuoso
							data={notifications}
							overscan={25}
							initialScrollTop={lastScrollOffset}
							onScroll={(e) => {
								const target = e.target as HTMLElement;
								setScrollOffsetDebounced(target.scrollTop);
							}}
							endReached={() => {
								if (hasNextPage && !isFetchingNextPage) {
									fetchNextPage();
								}
							}}
							itemContent={(index, notification) => {
								const previous = notifications[index - 1];
								const newDay = isNewDay(notification.receivedAt, previous?.receivedAt);

								return (
									<>
										{newDay && (
											<MessageDivider>
												{formatDate(new Date(notification.receivedAt))}
												{` \u00B7 ${countsByDate.get(new Date(notification.receivedAt).toDateString())} ${t('activities')}`}
											</MessageDivider>
										)}
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
