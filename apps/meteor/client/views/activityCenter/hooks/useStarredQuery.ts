import { useRoomList } from '/client/sidebar/hooks/useRoomList';
import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { IMessage, RoomType } from '@rocket.chat/core-typings';
import { onClientMessageReceived } from '/client/lib/onClientMessageReceived';
import { mapMessageFromApi } from '/client/lib/utils/mapMessageFromApi';

export type StarredMessage = IMessage & {
	roomName: string | undefined;
	roomType: RoomType | undefined;
};

export const useStarredQuery = () => {
	const { roomList } = useRoomList({});
	const getStarred = useEndpoint('GET', '/v1/chat.getStarredMessages');

	return useQuery<StarredMessage[]>({
		queryKey: ['starred', roomList.map((r) => r.rid)],
		enabled: roomList.length > 0,
		queryFn: async () => {
			const results = await Promise.all(
				roomList.map(async (room) => {
					const messages: IMessage[] = [];

					for (
						let offset = 0, result = await getStarred({ roomId: room.rid, offset: 0 });
						result.count > 0;
						offset += result.count, result = await getStarred({ roomId: room.rid, offset })
					) {
						messages.push(...result.messages.map(mapMessageFromApi));
					}

					const hydrated = await Promise.all(messages.map(onClientMessageReceived));

					return hydrated.map((msg) => {
						(msg as StarredMessage).roomName = room.name;
						(msg as StarredMessage).roomType = room.t;
						return msg as StarredMessage;
					});
				}),
			);

			return results.flat().sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
		},
	});
};
