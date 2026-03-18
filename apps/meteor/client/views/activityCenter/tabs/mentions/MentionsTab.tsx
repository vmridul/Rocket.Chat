import type { ReactElement } from 'react';
import { Box } from '@rocket.chat/fuselage';

import ActivityCenterFiltersContextualBar from '../../components/ActivityCenterFiltersContextualBar';
import { useActivityCenterContext } from '../../contexts/ActivityCenterContext';
import MentionsMessagesList from './MentionsMessagesList';

const MentionsTab = (): ReactElement => {
	const { isFiltersOpen } = useActivityCenterContext();

	return (
		<Box display='flex' height='100%' width='100%'>
			<Box flexGrow={1} overflow='hidden'>
				<MentionsMessagesList />
			</Box>
			{isFiltersOpen && <ActivityCenterFiltersContextualBar />}
		</Box>
	);
};

export default MentionsTab;
