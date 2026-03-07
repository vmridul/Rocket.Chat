import { NavBarItem } from '@rocket.chat/fuselage';
import { useEffectEvent } from '@rocket.chat/fuselage-hooks';
import { useRouter, useCurrentRoutePath } from '@rocket.chat/ui-contexts';
import type { HTMLAttributes } from 'react';

type NavBarItemActivityCenterProps = Omit<HTMLAttributes<HTMLElement>, 'is'>;

const NavBarItemActivityCenter = (props: NavBarItemActivityCenterProps) => {
	const router = useRouter();
	const handleActivityCenter = useEffectEvent(() => {
		router.navigate('/activity-center');
	});
	const currentRoute = useCurrentRoutePath();

	return <NavBarItem {...props} icon='bell' onClick={handleActivityCenter} pressed={currentRoute?.includes('/activity-center')} />;
};

export default NavBarItemActivityCenter;
