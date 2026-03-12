import { NavBarItem, Box, Badge } from '@rocket.chat/fuselage';
import { useEffectEvent } from '@rocket.chat/fuselage-hooks';
import { useRouter, useCurrentRoutePath } from '@rocket.chat/ui-contexts';
import type { HTMLAttributes } from 'react';
import { css } from '@rocket.chat/css-in-js';
import { useActivityNotifications } from '../../views/activityCenter/hooks/useActivityNotifications';

type NavBarItemActivityCenterProps = Omit<HTMLAttributes<HTMLElement>, 'is'>;

const NavBarItemActivityCenter = (props: NavBarItemActivityCenterProps) => {
	const router = useRouter();
	const { getUnreadCount } = useActivityNotifications();
	const unreadCount = getUnreadCount();

	const handleActivityCenter = useEffectEvent(() => {
		router.navigate('/activity-center');
	});
	const currentRoute = useCurrentRoutePath();

	return (
		<Box position='relative'>
			<NavBarItem {...props} icon='list-alt' onClick={handleActivityCenter} pressed={currentRoute?.includes('/activity-center')} />
			{unreadCount > 0 && (
				<Box
					position='absolute'
					role='status'
					className={css`
						top: 0;
						right: 0;
						transform: translate(30%, -30%);
						z-index: 1;
					`}
				>
					<Badge variant='danger'>{unreadCount > 99 ? '99+' : unreadCount}</Badge>
				</Box>
			)}
		</Box>
	);
};

export default NavBarItemActivityCenter;
