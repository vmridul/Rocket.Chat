import { Tabs } from '@rocket.chat/fuselage';
import { Page, PageHeader, PageContent } from '@rocket.chat/ui-client';
import { useRouter, useRouteParameter } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import MentionsTab from './tabs/mentions/MentionsTab';
import StarredTab from './tabs/starred/StarredTab';

type TabName = 'mentions' | 'starred';

const ActivityCenterPage = (): ReactElement => {
	const { t } = useTranslation();
	const tab = useRouteParameter('tab') as TabName | undefined;
	const router = useRouter();

	useEffect(
		() =>
			router.subscribeToRouteChange(() => {
				if (router.getRouteName() !== 'activity-center') {
					return;
				}

				const { tab } = router.getRouteParameters();

				if (!tab) {
					router.navigate('/activity-center/mentions', { replace: true });
				}
			}),
		[router],
	);

	const handleTabClick = useCallback((tab: TabName) => () => router.navigate(`/activity-center/${tab}`), [router]);

	return (
		<Page background='room'>
			<PageHeader title={t('Activity Center')} />
			<Tabs flexShrink={0}>
				<Tabs.Item selected={tab === 'mentions'} onClick={handleTabClick('mentions')}>
					{t('Mentions')}
				</Tabs.Item>
				<Tabs.Item selected={tab === 'starred'} onClick={handleTabClick('starred')}>
					{t('Starred Messages')}
				</Tabs.Item>
			</Tabs>
			<PageContent paddingInline={0} overflow='hidden' height='100%'>
				{tab === 'mentions' && <MentionsTab />}
				{tab === 'starred' && <StarredTab />}
			</PageContent>
		</Page>
	);
};

export default ActivityCenterPage;
