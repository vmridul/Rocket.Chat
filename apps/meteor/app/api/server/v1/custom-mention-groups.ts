import { CustomMentionGroups } from '@rocket.chat/models';
import {
	ajv,
	validateUnauthorizedErrorResponse,
	validateForbiddenErrorResponse,
	validateBadRequestErrorResponse,
} from '@rocket.chat/rest-typings';

import {
	createGroup,
	updateGroup,
	deleteGroup,
	addMembers,
	removeMembers,
	getGroupMembers,
} from '../../../../server/services/customMentionGroups/service';

import { hasPermissionAsync } from '../../../authorization/server/functions/hasPermission';
import type { ExtractRoutesFromAPI } from '../ApiClass';
import { API } from '../api';
import { getPaginationItems } from '../helpers/getPaginationItems';

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateGroupBody = { name: string; userIds: string[]; description?: string };
type UpdateGroupBody = { groupId: string; name: string; userIds: string[]; description?: string };
type DeleteGroupBody = { groupId: string };
type AddMembersBody = { groupId: string; userIds: string[] };
type RemoveMembersBody = { groupId: string; userIds: string[] };

// ─── Validators ───────────────────────────────────────────────────────────────

const isCreateGroupProps = ajv.compile<CreateGroupBody>({
	type: 'object',
	properties: {
		name: { type: 'string', minLength: 1 },
		description: { type: 'string', maxLength: 500 },
		userIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
	},
	required: ['name', 'userIds'],
	additionalProperties: false,
});

const isUpdateGroupProps = ajv.compile<UpdateGroupBody>({
	type: 'object',
	properties: {
		groupId: { type: 'string', minLength: 1 },
		name: { type: 'string', minLength: 1 },
		description: { type: 'string', maxLength: 500, nullable: true },
		userIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
	},
	required: ['groupId', 'name', 'userIds'],
	additionalProperties: false,
});

const isDeleteGroupProps = ajv.compile<DeleteGroupBody>({
	type: 'object',
	properties: {
		groupId: { type: 'string', minLength: 1 },
	},
	required: ['groupId'],
	additionalProperties: false,
});

const isAddMembersProps = ajv.compile<AddMembersBody>({
	type: 'object',
	properties: {
		groupId: { type: 'string', minLength: 1 },
		userIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
	},
	required: ['groupId', 'userIds'],
	additionalProperties: false,
});

const isRemoveMembersProps = ajv.compile<RemoveMembersBody>({
	type: 'object',
	properties: {
		groupId: { type: 'string', minLength: 1 },
		userIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
	},
	required: ['groupId', 'userIds'],
	additionalProperties: false,
});

// ─── Common Response Helpers ──────────────────────────────────────────────────

const successOnly = ajv.compile({
	type: 'object',
	properties: {
		success: { type: 'boolean', enum: [true] },
	},
	required: ['success'],
	additionalProperties: false,
});

// ─── Endpoints ────────────────────────────────────────────────────────────────

const customMentionGroupsEndpoints = API.v1

	.post(
		'custom-mentions.groups.create',
		{
			authRequired: true,
			body: isCreateGroupProps,
			response: {
				200: ajv.compile({
					type: 'object',
					properties: {
						group: { $ref: '#/components/schemas/ICustomMentionGroup' },
						success: { type: 'boolean', enum: [true] },
					},
					required: ['group', 'success'],
					additionalProperties: false,
				}),
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'create-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { name, userIds, description } = this.bodyParams;
			const group = await createGroup(name, userIds, this.userId, description);
			return API.v1.success({ group });
		},
	)

	.put(
		'custom-mentions.groups.update',
		{
			authRequired: true,
			body: isUpdateGroupProps,
			response: {
				200: successOnly,
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'edit-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { groupId, name, userIds, description } = this.bodyParams;
			await updateGroup(groupId, name, userIds, description);
			return API.v1.success({});
		},
	)

	.post(
		'custom-mentions.groups.delete',
		{
			authRequired: true,
			body: isDeleteGroupProps,
			response: {
				200: successOnly,
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'delete-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { groupId } = this.bodyParams;
			await deleteGroup(groupId);
			return API.v1.success({});
		},
	)

	.get(
		'custom-mentions.groups.list',
		{
			authRequired: true,
			response: {
				200: ajv.compile({
					type: 'object',
					properties: {
						groups: {
							type: 'array',
							items: { $ref: '#/components/schemas/ICustomMentionGroup' },
						},
						count: { type: 'number' },
						offset: { type: 'number' },
						total: { type: 'number' },
						success: { type: 'boolean', enum: [true] },
					},
					required: ['groups', 'count', 'offset', 'total', 'success'],
					additionalProperties: false,
				}),
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'view-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { offset, count } = await getPaginationItems(this.queryParams);
			const { cursor, totalCount } = CustomMentionGroups.findPaginated({}, { skip: offset, limit: count });
			const [groups, total] = await Promise.all([cursor.toArray(), totalCount]);
			return API.v1.success({ groups, count: groups.length, offset, total });
		},
	)

	.get(
		'custom-mentions.groups.info',
		{
			authRequired: true,
			response: {
				200: ajv.compile({
					type: 'object',
					properties: {
						group: { $ref: '#/components/schemas/ICustomMentionGroup' },
						success: { type: 'boolean', enum: [true] },
					},
					required: ['group', 'success'],
					additionalProperties: false,
				}),
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'view-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { groupId } = this.queryParams;
			if (!groupId) {
				return API.v1.failure('The required "groupId" query param is missing');
			}
			const group = await CustomMentionGroups.findOneById(groupId);
			if (!group) {
				return API.v1.failure('Group not found');
			}
			return API.v1.success({ group });
		},
	)

	.get(
		'custom-mentions.groups.members',
		{
			authRequired: true,
			response: {
				200: ajv.compile({
					type: 'object',
					properties: {
						members: { type: 'array', items: { type: 'string' } },
						count: { type: 'number' },
						offset: { type: 'number' },
						total: { type: 'number' },
						success: { type: 'boolean', enum: [true] },
					},
					required: ['members', 'count', 'offset', 'total', 'success'],
					additionalProperties: false,
				}),
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'view-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { groupId } = this.queryParams;
			if (!groupId) {
				return API.v1.failure('The required "groupId" query param is missing');
			}
			const { offset, count } = await getPaginationItems(this.queryParams);
			const { members, total } = await getGroupMembers(groupId, offset, count);
			return API.v1.success({ members, count: members.length, offset, total });
		},
	)

	.post(
		'custom-mentions.groups.addMembers',
		{
			authRequired: true,
			body: isAddMembersProps,
			response: {
				200: successOnly,
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'edit-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { groupId, userIds } = this.bodyParams;
			await addMembers(groupId, userIds);
			return API.v1.success({});
		},
	)

	.post(
		'custom-mentions.groups.removeMembers',
		{
			authRequired: true,
			body: isRemoveMembersProps,
			response: {
				200: successOnly,
				400: validateBadRequestErrorResponse,
				401: validateUnauthorizedErrorResponse,
				403: validateForbiddenErrorResponse,
			},
		},
		async function action() {
			if (!(await hasPermissionAsync(this.userId, 'edit-custom-mention-groups'))) {
				return API.v1.unauthorized('Unauthorized');
			}
			const { groupId, userIds } = this.bodyParams;
			await removeMembers(groupId, userIds);
			return API.v1.success({});
		},
	);

export type CustomMentionGroupEndpoints = ExtractRoutesFromAPI<typeof customMentionGroupsEndpoints>;

declare module '@rocket.chat/rest-typings' {
	interface Endpoints extends CustomMentionGroupEndpoints {}
}
