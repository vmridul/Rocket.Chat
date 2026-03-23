import type { IRocketChatRecord } from './IRocketChatRecord';

export interface ICustomMentionGroup extends IRocketChatRecord {
	_id: string;
	name: string;
	description?: string;
	userIds: string[];
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}
