import type { ReactElement } from 'react';
import { useState } from 'react';
import { Box, Button, MessageDivider } from '@rocket.chat/fuselage';
import { ContextualbarEmptyContent, VirtualizedScrollbars } from '@rocket.chat/ui-client';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';

import FilterByText from '/client/components/FilterByText';
import { useFormatDate } from '/client/hooks/useFormatDate';
import { isMessageNewDay } from '/client/views/room/MessageList/lib/isMessageNewDay';

import { useActivityCenterContext } from '../../contexts/ActivityCenterContext';
import { useMentionsQuery } from '../../hooks/useMentionsQuery';

import MentionsMessageItem from './MentionsMessageItem';

const MentionsMessagesList = (): ReactElement => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const { data, isFetched, isLoading, isError } = useMentionsQuery();
	const { setIsFiltersOpen, hasAppliedFilters } = useActivityCenterContext();
	const [searchText, setSearchText] = useState('');

	const filteredMentions = data?.filter((message) => message.msg?.toLowerCase().includes(searchText.toLowerCase()));

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

			{isLoading && <div>{t('Loading')}</div>}
			{isError && <div>{t('Error')}</div>}
			{isFetched && filteredMentions?.length === 0 && <ContextualbarEmptyContent title={t('No_mentions_found')} />}

			{isFetched && filteredMentions && filteredMentions.length > 0 && (
				<Box flexGrow={1} minHeight={0}>
					<VirtualizedScrollbars>
						<Virtuoso
							data={filteredMentions}
							overscan={25}
							itemContent={(index, message) => {
								const previous = filteredMentions[index - 1];
								const newDay = isMessageNewDay(message, previous);

								return (
									<>
										{newDay && <MessageDivider>{formatDate(message.ts)}</MessageDivider>}
										<MentionsMessageItem message={message} />
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
