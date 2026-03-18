import { Tabs } from '@rocket.chat/fuselage';
import { Page, PageHeader, PageContent } from '@rocket.chat/ui-client';
import { useRouter, useRouteParameter } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import AllActivityTab from './tabs/allActivity/AllActivityTab';
import MentionsTab from './tabs/mentions/MentionsTab';
import StarredTab from './tabs/starred/StarredTab';
import ActivityCenterProvider from './providers/ActivityCenterProvider';

type TabName = 'all-activity' | 'notifications' | 'starred';

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
					router.navigate('/activity-center/all-activity', { replace: true });
				}
			}),
		[router],
	);

	const handleTabClick = useCallback((tab: TabName) => () => router.navigate(`/activity-center/${tab}`), [router]);

	return (
		<Page background='room'>
			<PageHeader title={t('Activity Center')} />
			<Tabs flexShrink={0}>
				<Tabs.Item selected={tab === 'all-activity'} onClick={handleTabClick('all-activity')}>
					{t('All Activity')}
				</Tabs.Item>
				<Tabs.Item selected={tab === 'notifications'} onClick={handleTabClick('notifications')}>
					{t('Mentions')}
				</Tabs.Item>
				<Tabs.Item selected={tab === 'starred'} onClick={handleTabClick('starred')}>
					{t('Starred Messages')}
				</Tabs.Item>
			</Tabs>
			<ActivityCenterProvider>
				<PageContent paddingInline={0} overflow='hidden' height='100%'>
					{tab === 'all-activity' && <AllActivityTab />}
					{tab === 'notifications' && <MentionsTab />}
					{tab === 'starred' && <StarredTab />}
				</PageContent>
			</ActivityCenterProvider>
		</Page>
	);
};

export default ActivityCenterPage;
