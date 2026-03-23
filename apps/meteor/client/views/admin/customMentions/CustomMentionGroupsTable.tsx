import { Pagination, States, StatesIcon, StatesActions, StatesAction, StatesTitle, Box } from '@rocket.chat/fuselage';
import { useDebouncedValue } from '@rocket.chat/fuselage-hooks';
import {
	GenericTable,
	GenericTableBody,
	GenericTableHeader,
	GenericTableHeaderCell,
	GenericTableLoadingTable,
	GenericTableRow,
	GenericTableCell,
	usePagination,
	useSort,
} from '@rocket.chat/ui-client';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { MutableRefObject } from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import FilterByText from '../../../components/FilterByText';
import GenericNoResults from '../../../components/GenericNoResults';

type CustomMentionGroupsTableProps = {
	onClick: (id: string) => () => void;
	reload: MutableRefObject<() => void>;
};

const CustomMentionGroupsTable = ({ reload, onClick }: CustomMentionGroupsTableProps) => {
	const { t } = useTranslation();
	const { sortBy, sortDirection, setSort } = useSort<'name'>('name');
	const { current, itemsPerPage, setItemsPerPage: onSetItemsPerPage, setCurrent: onSetCurrent, ...paginationProps } = usePagination();
	const [text, setText] = useState('');

	const query = useDebouncedValue(
		useMemo(
			() => ({
				sort: `{ "${sortBy}": ${sortDirection === 'asc' ? 1 : -1} }`,
				...(itemsPerPage && { count: itemsPerPage }),
				...(current && { offset: current }),
			}),
			[itemsPerPage, current, sortBy, sortDirection],
		),
		500,
	);

	const getGroups = useEndpoint('GET', '/v1/custom-mentions.groups.list');
	const { data, refetch, isLoading, isError, isSuccess } = useQuery({
		queryKey: ['custom-mention-groups', query],
		queryFn: async () => getGroups(query as any),
		refetchOnMount: false,
	});

	useEffect(() => {
		reload.current = refetch as any;
	}, [reload, refetch]);

	const groups = useMemo(() => {
		const allGroups = ((data as any)?.groups ?? []) as { _id: string; name: string; description?: string; userIds: string[] }[];
		if (!text) return allGroups;
		const regex = new RegExp(text, 'i');
		return allGroups.filter((g) => regex.test(g.name) || regex.test(g.description || ''));
	}, [data, text]);

	const headers = (
		<>
			<GenericTableHeaderCell key='name' direction={sortDirection} active={sortBy === 'name'} onClick={setSort} sort='name'>
				{t('Name')}
			</GenericTableHeaderCell>
			<GenericTableHeaderCell key='description'>{t('Description')}</GenericTableHeaderCell>
			<GenericTableHeaderCell key='members'>{t('Members')}</GenericTableHeaderCell>
		</>
	);

	return (
		<>
			<FilterByText value={text} onChange={(event) => setText(event.target.value)} />
			{isLoading && (
				<GenericTable>
					<GenericTableHeader>{headers}</GenericTableHeader>
					<GenericTableBody>
						<GenericTableLoadingTable headerCells={2} />
					</GenericTableBody>
				</GenericTable>
			)}
			{isSuccess && groups.length > 0 && (
				<>
					<GenericTable>
						<GenericTableHeader>{headers}</GenericTableHeader>
						<GenericTableBody>
							{groups.map((group) => (
								<GenericTableRow key={group._id} onClick={onClick(group._id)} tabIndex={0} role='link' action>
									<GenericTableCell>
										<Box withTruncatedText>{group.name}</Box>
									</GenericTableCell>
									<GenericTableCell>
										<Box withTruncatedText>{group.description || '-'}</Box>
									</GenericTableCell>
									<GenericTableCell>{group.userIds.length}</GenericTableCell>
								</GenericTableRow>
							))}
						</GenericTableBody>
					</GenericTable>
					<Pagination
						divider
						current={current}
						itemsPerPage={itemsPerPage}
						count={groups.length}
						onSetItemsPerPage={onSetItemsPerPage}
						onSetCurrent={onSetCurrent}
						{...paginationProps}
					/>
				</>
			)}
			{isSuccess && groups.length === 0 && <GenericNoResults />}
			{isError && (
				<States>
					<StatesIcon name='warning' variation='danger' />
					<StatesTitle>{t('Something_went_wrong')}</StatesTitle>
					<StatesActions>
						<StatesAction onClick={() => refetch()}>{t('Reload_page')}</StatesAction>
					</StatesActions>
				</States>
			)}
		</>
	);
};

export default CustomMentionGroupsTable;
