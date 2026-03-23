import type { ICustomMentionGroup, RocketChatRecordDeleted } from '@rocket.chat/core-typings';
import type { ICustomMentionGroupsModel } from '@rocket.chat/model-typings';
import type {
	Collection,
	FindCursor,
	Db,
	FindOptions,
	IndexDescription,
	InsertOneResult,
	UpdateResult,
	DeleteResult,
	WithId,
} from 'mongodb';

import { BaseRaw } from './BaseRaw';

export class CustomMentionGroupsRaw extends BaseRaw<ICustomMentionGroup> implements ICustomMentionGroupsModel {
	constructor(db: Db, trash?: Collection<RocketChatRecordDeleted<ICustomMentionGroup>>) {
		super(db, 'custom_mention_groups', trash);
	}

	protected override modelIndexes(): IndexDescription[] {
		return [
			{
				key: { name: 1 },
				unique: true,
				name: 'custom_mention_groups_name_unique',
			},
		];
	}

	findOneByName(name: string, options?: FindOptions<ICustomMentionGroup>): Promise<ICustomMentionGroup | null> {
		return this.findOne({ name }, options);
	}

	findByIds(ids: string[], options?: FindOptions<ICustomMentionGroup>): FindCursor<ICustomMentionGroup> {
		return this.find({ _id: { $in: ids } }, options);
	}

	findAllPaginated(options?: FindOptions<ICustomMentionGroup>): FindCursor<ICustomMentionGroup> {
		return this.find({}, options);
	}

	async createGroup(
		data: Omit<ICustomMentionGroup, '_id' | '_updatedAt' | 'createdAt' | 'updatedAt'>,
	): Promise<InsertOneResult<WithId<ICustomMentionGroup>>> {
		const now = new Date();
		return this.insertOne({
			...data,
			createdAt: now,
			updatedAt: now,
			_updatedAt: now,
		} as ICustomMentionGroup);
	}

	updateGroupName(id: string, name: string): Promise<UpdateResult> {
		return this.updateOne(
			{ _id: id },
			{
				$set: {
					name,
					updatedAt: new Date(),
				},
			},
		);
	}

	updateGroup(id: string, name: string, userIds: string[], description?: string): Promise<UpdateResult> {
		return this.updateOne(
			{ _id: id },
			{
				$set: {
					name,
					userIds,
					description: description,
					updatedAt: new Date(),
				},
			},
		);
	}

	addMembers(id: string, userIds: string[]): Promise<UpdateResult> {
		return this.updateOne(
			{ _id: id },
			{
				$addToSet: { userIds: { $each: userIds } },
				$set: { updatedAt: new Date() },
			},
		);
	}

	removeMembers(id: string, userIds: string[]): Promise<UpdateResult> {
		return this.updateOne(
			{ _id: id },
			{
				$pull: { userIds: { $in: userIds } as any },
				$set: { updatedAt: new Date() },
			},
		);
	}

	deleteGroup(id: string): Promise<DeleteResult> {
		return this.deleteOne({ _id: id });
	}
}
