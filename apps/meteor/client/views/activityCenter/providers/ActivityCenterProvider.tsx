import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { ActivityCenterContext, initialValues } from '../contexts/ActivityCenterContext';

type ActivityCenterProviderProps = {
	children: ReactNode;
};

const ActivityCenterProvider = ({ children }: ActivityCenterProviderProps) => {
	const [filtersQuery, setFiltersQuery] = useLocalStorage('activityCenterFiltersQuery', initialValues);
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);

	const hasAppliedFilters =
		filtersQuery.roomType !== 'all' ||
		filtersQuery.unread !== 'all' ||
		!!filtersQuery.fromDate ||
		!!filtersQuery.toDate ||
		(filtersQuery.usernames?.length ?? 0) > 0 ||
		(filtersQuery.roomIds?.length ?? 0) > 0;

	const contextValue = useMemo(
		() => ({
			filtersQuery,
			setFiltersQuery,
			resetFiltersQuery: () => setFiltersQuery(initialValues),
			hasAppliedFilters,
			isFiltersOpen,
			setIsFiltersOpen,
		}),
		[filtersQuery, setFiltersQuery, hasAppliedFilters, isFiltersOpen],
	);

	return <ActivityCenterContext.Provider value={contextValue}>{children}</ActivityCenterContext.Provider>;
};

export default ActivityCenterProvider;
