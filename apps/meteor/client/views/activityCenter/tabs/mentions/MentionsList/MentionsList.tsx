import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Bubble, MessageDivider, ContextualbarEmptyContent } from '@rocket.chat/fuselage';
import MentionItem from './MentionItem';
import { useMentionsQuery } from '../../../hooks/useMentionsQuery';

const formatDate = (date: Date | string): string => new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(date));

const MentionsList = (): ReactElement => {
	const { t } = useTranslation();
	const { data, isFetched, isLoading, isError } = useMentionsQuery();

	return (
		<Box overflowY='auto' height='100%'>
			{isLoading && <div>{t('Loading')}</div>}
			{isError && <div>{t('Error_loading_mentions')}</div>}
			{isFetched && data?.length === 0 && <ContextualbarEmptyContent title={t('No_mentions')} />}
			{isFetched &&
				data?.map((msg, index) => {
					const prevMsg = data[index - 1];
					const sequential = !!prevMsg && prevMsg.rid === msg.rid;
					const newDay = !prevMsg || new Date(msg.ts).toDateString() !== new Date(prevMsg.ts).toDateString();

					return (
						<Box key={msg._id}>
							{newDay && (
								<MessageDivider>
									<Bubble small secondary>
										{formatDate(msg.ts)}
									</Bubble>
								</MessageDivider>
							)}
							<MentionItem message={msg} sequential={sequential} />
						</Box>
					);
				})}
		</Box>
	);
};

export default MentionsList;
