import type { SetStateAction } from 'react';
import { createContext, useContext } from 'react';

export type RoomTypeFilter = 'all' | 'c' | 'p' | 'd';
export type MessageTypeFilter = 'all' | 'mention' | 'highlight' | 'reaction' | 'thread' | 'discussion';

export type ActivityCenterFiltersQuery = {
	roomType: RoomTypeFilter;
	messageType: MessageTypeFilter;
	unread: 'all' | 'unread' | 'read';
	fromDate?: string;
	toDate?: string;
	usernames?: string[];
	roomIds?: string[];
};

export const initialValues: ActivityCenterFiltersQuery = {
	roomType: 'all',
	messageType: 'all',
	unread: 'all',
	fromDate: '',
	toDate: '',
	usernames: [],
	roomIds: [],
};

export type ActivityCenterContextValue = {
	filtersQuery: ActivityCenterFiltersQuery;
	setFiltersQuery: (value: SetStateAction<ActivityCenterFiltersQuery>) => void;
	resetFiltersQuery: () => void;
	hasAppliedFilters: boolean;
	isFiltersOpen: boolean;
	setIsFiltersOpen: (value: boolean) => void;
};

export const ActivityCenterContext = createContext<ActivityCenterContextValue | undefined>(undefined);

export const useActivityCenterContext = (): ActivityCenterContextValue => {
	const context = useContext(ActivityCenterContext);
	if (!context) {
		throw new Error('useActivityCenterContext must be used within ActivityCenterProvider');
	}
	return context;
};
