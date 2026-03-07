import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, MessageDivider } from '@rocket.chat/fuselage';
import { Virtuoso } from 'react-virtuoso';
import { VirtualizedScrollbars, ContextualbarEmptyContent } from '@rocket.chat/ui-client';

import { useStarredMessagesQuery } from '../../../hooks/useStarredQuery';
import { useFormatDate } from '/client/hooks/useFormatDate';
import { isMessageNewDay } from '/client/views/room/MessageList/lib/isMessageNewDay';

import StarredItem from './StarredItem';
import FilterByText from '/client/components/FilterByText';

const StarredList = (): ReactElement => {
	const { t } = useTranslation();
	const formatDate = useFormatDate();

	const { data, isFetched, isLoading, isError } = useStarredMessagesQuery();

	const [searchText, setSearchText] = useState('');

	const filteredData = data?.filter((msg) => msg.msg?.toLowerCase().includes(searchText.toLowerCase()));

	return (
		<Box height='100%' display='flex' flexDirection='column'>
			<Box paddingInline={16}>
				<FilterByText placeholder={t('Search Starred Messages')} value={searchText} onChange={(e) => setSearchText(e.target.value)} />
			</Box>

			{isLoading && <div>{t('Loading')}</div>}
			{isError && <div>{t('Error loading starred messages')}</div>}

			{isFetched && filteredData?.length === 0 && <ContextualbarEmptyContent title={t('No starred messages')} />}

			{isFetched && filteredData && filteredData.length > 0 && (
				<Box flexGrow={1} minHeight={0}>
					<VirtualizedScrollbars>
						<Virtuoso
							data={filteredData}
							overscan={25}
							itemContent={(index, message) => {
								const previous = filteredData[index - 1];
								const newDay = isMessageNewDay(message, previous);

								return (
									<>
										{newDay && <MessageDivider>{formatDate(message.ts)}</MessageDivider>}

										<StarredItem message={message} />
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

export default StarredList;
