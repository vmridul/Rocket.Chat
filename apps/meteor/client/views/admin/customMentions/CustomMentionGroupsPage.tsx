import { Button } from '@rocket.chat/fuselage';
import {
	ContextualbarTitle,
	ContextualbarClose,
	ContextualbarHeader,
	ContextualbarDialog,
	Page,
	PageHeader,
	PageContent,
} from '@rocket.chat/ui-client';
import { useRoute, useRouteParameter } from '@rocket.chat/ui-contexts';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import CustomMentionGroupsTable from './CustomMentionGroupsTable';
import AddCustomMentionGroup from './AddCustomMentionGroup';
import EditCustomMentionGroup from './EditCustomMentionGroup';

const CustomMentionGroupsPage = () => {
	const { t } = useTranslation();
	const route = useRoute('custom-mention-groups');
	const context = useRouteParameter('context');
	const id = useRouteParameter('id');
	const reload = useRef(() => null);

	const handleNewButtonClick = useCallback(() => {
		route.push({ context: 'new' });
	}, [route]);

	const handleItemClick = useCallback(
		(_id: string) => (): void => {
			route.push({ context: 'edit', id: _id });
		},
		[route],
	);

	const handleClose = useCallback(() => {
		route.push({});
	}, [route]);

	const handleReload = useCallback(() => {
		reload.current();
	}, []);

	return (
		<Page flexDirection='row'>
			<Page name='admin-custom-mention-groups'>
				<PageHeader title={t('Custom_Mentions')}>
					<Button primary onClick={handleNewButtonClick} aria-label={t('New')}>
						{t('New')}
					</Button>
				</PageHeader>
				<PageContent>
					<CustomMentionGroupsTable reload={reload} onClick={handleItemClick} />
				</PageContent>
			</Page>
			{context && (
				<ContextualbarDialog onClose={handleClose}>
					<ContextualbarHeader>
						<ContextualbarTitle>
							{context === 'edit' && t('Edit_Custom_Mention_Group')}
							{context === 'new' && t('New_Custom_Mention_Group')}
						</ContextualbarTitle>
						<ContextualbarClose onClick={handleClose} />
					</ContextualbarHeader>
					{context === 'new' && <AddCustomMentionGroup close={handleClose} onChange={handleReload} goToNew={handleItemClick} />}
					{context === 'edit' && id && <EditCustomMentionGroup _id={id} close={handleClose} onChange={handleReload} />}
				</ContextualbarDialog>
			)}
		</Page>
	);
};

export default CustomMentionGroupsPage;
