import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';

export type CustomMentionGroupOption = {
	_id: string;
	name: string;
	userIds: string[];
	isCustomMentionGroup: true;
	sort?: number;
};

export const useCustomMentionGroups = (filter: string) => {
	const getGroups = useEndpoint('GET', '/v1/custom-mentions.groups.list');

	return useQuery({
		queryKey: ['custom-mention-groups', filter],
		queryFn: async () => {
			const result = await getGroups({ count: '20', offset: '0' } as any);
			const groups = (result as any).groups ?? [];

			const filterRegex = filter ? new RegExp(filter, 'i') : null;

			return groups
				.filter((g: any) => !filterRegex || filterRegex.test(g.name))
				.map((g: any) => ({
					_id: g._id,
					name: g.name,
					userIds: g.userIds,
					isCustomMentionGroup: true as const,
					sort: 2,
				}));
		},
		placeholderData: [],
	});
};
