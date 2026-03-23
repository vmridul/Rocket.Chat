import type { ICustomMentionGroup } from '@rocket.chat/core-typings';
import type { FindOptions, FindCursor, InsertOneResult, UpdateResult, DeleteResult, WithId } from 'mongodb';

import type { IBaseModel } from './IBaseModel';

export interface ICustomMentionGroupsModel extends IBaseModel<ICustomMentionGroup> {
	findOneByName(name: string, options?: FindOptions<ICustomMentionGroup>): Promise<ICustomMentionGroup | null>;

	findByIds(ids: string[], options?: FindOptions<ICustomMentionGroup>): FindCursor<ICustomMentionGroup>;

	findAllPaginated(options?: FindOptions<ICustomMentionGroup>): FindCursor<ICustomMentionGroup>;

	createGroup(
		data: Omit<ICustomMentionGroup, '_id' | '_updatedAt' | 'createdAt' | 'updatedAt'>,
	): Promise<InsertOneResult<WithId<ICustomMentionGroup>>>;

	updateGroupName(id: string, name: string): Promise<UpdateResult>;
	updateGroup(id: string, name: string, userIds: string[], description?: string): Promise<UpdateResult>;

	addMembers(id: string, userIds: string[]): Promise<UpdateResult>;

	removeMembers(id: string, userIds: string[]): Promise<UpdateResult>;

	deleteGroup(id: string): Promise<DeleteResult>;
}
