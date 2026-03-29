import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { Box, Button, MessageDivider } from '@rocket.chat/fuselage';
import { ContextualbarEmptyContent, VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@rocket.chat/fuselage-hooks';
import debounce from 'lodash.debounce';

import FilterByText from '/client/components/FilterByText';
import { useFormatDate } from '/client/hooks/useFormatDate';

import { useActivityCenterContext } from '../../contexts/ActivityCenterContext';
import { useActivityNotifications } from '../../hooks/useActivityNotifications';
import ActivityItem from '../allActivity/AllActivityItem';

let lastScrollOffsetMentions = 0;

const MentionsMessagesList = (): ReactElement => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const { filtersQuery, setIsFiltersOpen, hasAppliedFilters } = useActivityCenterContext();
	const [searchText, setSearchText] = useState('');
	const debouncedSearchText = useDebouncedValue(searchText, 400);

	const fetchParams = useMemo(() => ({
		...filtersQuery,
		messageType: 'mention' as const,
	}), [filtersQuery]);

	const {
		notifications,
		clearOne,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useActivityNotifications(fetchParams, debouncedSearchText);

	const setScrollOffsetDebounced = useMemo(
		() =>
			debounce((offset: number) => {
				lastScrollOffsetMentions = offset;
			}, 300),
		[],
	);

	const isNewDay = (receivedAt: Date | string, previousReceivedAt?: Date | string): boolean => {
		if (!previousReceivedAt) {
			return true;
		}
		return new Date(receivedAt).toDateString() !== new Date(previousReceivedAt).toDateString();
	};

	return (
		<Box height='100%' display='flex' flexDirection='column'>
			<Box display='flex' alignItems='center' paddingInline={16} paddingBlock={8} width='full'>
				<Box flexGrow={1} mie={8}>
					<FilterByText placeholder={t('Search')} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
				</Box>
				<Button icon='customize' onClick={() => setIsFiltersOpen(true)} color={hasAppliedFilters ? 'status-font-on-success' : undefined}>
					{t('Filters')}
				</Button>
			</Box>

			{isLoading && <Box paddingInline={16}>{t('Loading')}</Box>}
			{!isLoading && notifications.length === 0 && <ContextualbarEmptyContent title={t('No_mentions_found')} />}

			{notifications.length > 0 && (
				<Box flexGrow={1} minHeight={0}>
					<VirtualizedScrollbars>
						<Virtuoso
							data={notifications}
							overscan={25}
							initialScrollTop={lastScrollOffsetMentions}
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

export default MentionsMessagesList;
