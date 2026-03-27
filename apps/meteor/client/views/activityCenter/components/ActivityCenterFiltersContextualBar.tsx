import type { ReactElement, ChangeEvent } from 'react';
import { InputBox, Box, Button, Field, FieldLabel, FieldRow, Select } from '@rocket.chat/fuselage';
import {
	ContextualbarHeader,
	ContextualbarIcon,
	ContextualbarTitle,
	ContextualbarClose,
	ContextualbarScrollableContent,
	ContextualbarFooter,
	ContextualbarDialog,
} from '@rocket.chat/ui-client';
import { useId } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

import RoomAutoCompleteMultiple from '../../../components/RoomAutoCompleteMultiple';
import UserAutoCompleteMultiple from '../../../components/UserAutoCompleteMultiple';
import type { RoomTypeFilter, MessageTypeFilter } from '../contexts/ActivityCenterContext';
import { useActivityCenterContext } from '../contexts/ActivityCenterContext';

const ActivityCenterFiltersContextualBar = (): ReactElement => {
	const { t } = useTranslation();
	const { filtersQuery, setFiltersQuery, resetFiltersQuery, setIsFiltersOpen } = useActivityCenterContext();
	const formId = useId();
	const roomTypeFieldId = useId();
	const fromDateFieldId = useId();
	const toDateFieldId = useId();
	const messageTypeFieldId = useId();

	const messageTypeOptions: [MessageTypeFilter, string][] = [
		['all', 'All'],
		['mention', 'Mentions'],
		['highlight', 'Highlights'],
		['reaction', 'Reactions'],
		['thread', 'Threads'],
		['discussion', 'Discussions'],
		['pin', 'Pins'],
	];

	const roomTypeOptions: [RoomTypeFilter, string][] = [
		['all', t('All')],
		['c', t('Channels')],
		['p', t('Private_Groups')],
		['d', t('Direct_Messages')],
	];

	const handleResetFilters = () => {
		resetFiltersQuery();
	};

	return (
		<ContextualbarDialog>
			<ContextualbarHeader>
				<ContextualbarIcon name='customize' />
				<ContextualbarTitle>{t('Filters')}</ContextualbarTitle>
				<ContextualbarClose onClick={() => setIsFiltersOpen(false)} />
			</ContextualbarHeader>
			<ContextualbarScrollableContent is='form' id={formId}>
				<Field>
					<FieldLabel htmlFor={roomTypeFieldId}>{t('Type')}</FieldLabel>
					<FieldRow>
						<Select
							id={roomTypeFieldId}
							aria-label={t('Filter_By_Type')}
							options={roomTypeOptions}
							value={filtersQuery.roomType}
							onChange={(value) => setFiltersQuery((prev) => ({ ...prev, roomType: value as RoomTypeFilter }))}
						/>
					</FieldRow>
				</Field>
				<Field>
					<FieldLabel htmlFor={messageTypeFieldId}>Message type</FieldLabel>
					<FieldRow>
						<Select
							id={messageTypeFieldId}
							options={messageTypeOptions}
							value={filtersQuery.messageType}
							onChange={(value) => setFiltersQuery((prev) => ({ ...prev, messageType: value as MessageTypeFilter }))}
						/>
					</FieldRow>
				</Field>
				<Field>
					<FieldLabel>{t('Status')}</FieldLabel>
					<FieldRow>
						<Select
							aria-label={t('Filter_By_Status')}
							options={[
								['all', t('All')],
								['unread', t('Unread')],
								['read', t('Read')],
							]}
							value={filtersQuery.unread}
							onChange={(value) => setFiltersQuery((prev) => ({ ...prev, unread: value as 'all' | 'unread' | 'read' }))}
						/>
					</FieldRow>
				</Field>
				<Field>
					<FieldLabel htmlFor={fromDateFieldId}>{t('From')}</FieldLabel>
					<FieldRow>
						<InputBox
							id={fromDateFieldId}
							type='date'
							value={filtersQuery.fromDate || ''}
							max={format(new Date(), 'yyyy-MM-dd')}
							onChange={(e: ChangeEvent<HTMLInputElement>) => setFiltersQuery((prev) => ({ ...prev, fromDate: e.target.value }))}
						/>
					</FieldRow>
				</Field>
				<Field>
					<FieldLabel htmlFor={toDateFieldId}>{t('To')}</FieldLabel>
					<FieldRow>
						<InputBox
							id={toDateFieldId}
							type='date'
							value={filtersQuery.toDate || ''}
							max={format(new Date(), 'yyyy-MM-dd')}
							onChange={(e: ChangeEvent<HTMLInputElement>) => setFiltersQuery((prev) => ({ ...prev, toDate: e.target.value }))}
						/>
					</FieldRow>
				</Field>
				<Field>
					<FieldLabel>{t('From_User')}</FieldLabel>
					<FieldRow>
						<UserAutoCompleteMultiple
							placeholder={t('Add_people')}
							value={filtersQuery.usernames || []}
							onChange={(value) => setFiltersQuery((prev) => ({ ...prev, usernames: value }))}
						/>
					</FieldRow>
				</Field>
				<Field>
					<FieldLabel>{t('In_Room')}</FieldLabel>
					<FieldRow>
						<RoomAutoCompleteMultiple
							placeholder={t('Room_Name')}
							value={filtersQuery.roomIds || []}
							onChange={(value) => setFiltersQuery((prev) => ({ ...prev, roomIds: value as string[] }))}
						/>
					</FieldRow>
				</Field>
			</ContextualbarScrollableContent>
			<ContextualbarFooter>
				<Box display='flex' mie={16} justifyContent='flex-end'>
					<Button onClick={handleResetFilters} mie={8}>
						{t('Reset')}
					</Button>
					<Button primary onClick={() => setIsFiltersOpen(false)}>
						{t('Close')}
					</Button>
				</Box>
			</ContextualbarFooter>
		</ContextualbarDialog>
	);
};

export default ActivityCenterFiltersContextualBar;
