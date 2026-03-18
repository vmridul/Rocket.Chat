import type { ReactElement } from 'react';
import { Box } from '@rocket.chat/fuselage';
import AllActivityList from './AllActivityList';
import ActivityCenterFiltersContextualBar from '../../components/ActivityCenterFiltersContextualBar';
import { useActivityCenterContext } from '../../contexts/ActivityCenterContext';

const AllActivityTab = (): ReactElement => {
	const { isFiltersOpen } = useActivityCenterContext();

	return (
		<Box display='flex' height='100%' width='100%'>
			<Box flexGrow={1} overflow='hidden'>
				<AllActivityList />
			</Box>
			{isFiltersOpen && <ActivityCenterFiltersContextualBar />}
		</Box>
	);
};

export default AllActivityTab;
