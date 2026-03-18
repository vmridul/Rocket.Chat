import type { ReactElement } from 'react';
import { Box } from '@rocket.chat/fuselage';

import ActivityCenterFiltersContextualBar from '../../components/ActivityCenterFiltersContextualBar';
import { useActivityCenterContext } from '../../contexts/ActivityCenterContext';
import StarredList from './StarredList/StarredList';

const StarredTab = (): ReactElement => {
	const { isFiltersOpen } = useActivityCenterContext();

	return (
		<Box display='flex' height='100%' width='100%'>
			<Box flexGrow={1} overflow='hidden'>
				<StarredList />
			</Box>
			{isFiltersOpen && <ActivityCenterFiltersContextualBar />}
		</Box>
	);
};

export default StarredTab;
