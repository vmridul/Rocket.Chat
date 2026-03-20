import type { IRoom } from '@rocket.chat/core-typings';
import { memoize } from '@rocket.chat/memo';

import { callWithErrorHandling } from './callWithErrorHandling';
import { router } from '../../providers/RouterProvider';
import { Subscriptions } from '../../stores';
import { roomCoordinator } from '../rooms/roomCoordinator';

const getRoomById = memoize((rid: IRoom['_id']) => callWithErrorHandling('getRoomById', rid));

export type GoToRoomByIdOptions = {
	replace?: boolean;
	routeParamsOverrides?: Record<string, string>;
	queryParamsOverrides?: Record<string, string>;
};

export const goToRoomById = async (rid: IRoom['_id'], options: GoToRoomByIdOptions = {}): Promise<void> => {
	if (!rid) {
		return;
	}

	const subscription = Subscriptions.state.find((record) => record.rid === rid);
	const searchParams = { ...router.getSearchParameters(), ...options.queryParamsOverrides };

	if (subscription) {
		roomCoordinator.openRouteLink(subscription.t, subscription, searchParams, options);
		return;
	}

	const room = await getRoomById(rid);
	roomCoordinator.openRouteLink(room.t, { rid: room._id, ...room }, searchParams, options);
};
