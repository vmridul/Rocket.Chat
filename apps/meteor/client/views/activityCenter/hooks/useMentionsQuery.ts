import { useRoomList } from '/client/sidebar/hooks/useRoomList';
import { useEndpoint, useStream, useUserId } from '@rocket.chat/ui-contexts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { useEffect } from 'react';

export type MentionMessage = IMessage & {
	roomName: string | undefined;
	roomType: RoomType | undefined;
};

export const useMentionsQuery = () => {
	const { roomList } = useRoomList({});
	const getMentions = useEndpoint('GET', '/v1/chat.getMentionedMessages');
	const uid = useUserId();
	const queryClient = useQueryClient();
	const subscribeToNotifyUser = useStream('notify-user');
	const queryKey = ['mentions', uid, roomList.map((r) => r.rid)] as const;

	useEffect(() => {
		if (!uid) {
			return;
		}

		return subscribeToNotifyUser(`${uid}/subscriptions-changed`, () => {
			void queryClient.invalidateQueries({ queryKey: ['mentions', uid] });
		});
	}, [queryClient, subscribeToNotifyUser, uid]);

	return useQuery<MentionMessage[]>({
		queryKey,
		enabled: !!uid && roomList.length > 0,
		queryFn: async () => {
			const results = await Promise.all(
				roomList.map(async (room) => {
					const { messages = [] } = await getMentions({ roomId: room.rid });
					return messages
						.filter((msg) => msg.u._id !== uid)
						.map((msg) => ({
							...msg,
							roomName: room.name,
							roomType: room.t,
						}));
				}),
			);

			return results.flat().sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()) as unknown as MentionMessage[];
		},
	});
};
