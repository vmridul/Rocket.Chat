import { NavBarItem, Box, Badge } from '@rocket.chat/fuselage';
import { useEffectEvent } from '@rocket.chat/fuselage-hooks';
import { useRouter, useCurrentRoutePath } from '@rocket.chat/ui-contexts';
import type { HTMLAttributes } from 'react';
import { css } from '@rocket.chat/css-in-js';
import {
	initializeNotificationService,
	getUnreadNotificationCount,
	subscribeToNotifications,
} from '../../views/activityCenter/services/notificationService';
import { useState, useEffect } from 'react';

type NavBarItemActivityCenterProps = Omit<HTMLAttributes<HTMLElement>, 'is'>;

const NavBarItemActivityCenter = (props: NavBarItemActivityCenterProps) => {
	const router = useRouter();
	const [unreadCount, setUnreadCount] = useState(0);

	const handleActivityCenter = useEffectEvent(() => {
		router.navigate('/activity-center');
	});
	const currentRoute = useCurrentRoutePath();

	useEffect(() => {
		// Initialize the notification service
		initializeNotificationService();

		// Subscribe to notification updates
		const unsubscribe = subscribeToNotifications(() => {
			setUnreadCount(getUnreadNotificationCount());
		});

		return unsubscribe;
	}, []);

	return (
		<Box position='relative'>
			<NavBarItem {...props} icon='bell' onClick={handleActivityCenter} pressed={currentRoute?.includes('/activity-center')} />
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
