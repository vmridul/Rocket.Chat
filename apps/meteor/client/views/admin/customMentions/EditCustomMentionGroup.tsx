import { Box, Button, ButtonGroup, Field, FieldLabel, FieldRow, FieldError, TextInput } from '@rocket.chat/fuselage';
import { GenericModal, ContextualbarScrollableContent, ContextualbarFooter } from '@rocket.chat/ui-client';
import { useEndpoint, useSetModal, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import UserAutoCompleteMultiple from '../../../components/UserAutoCompleteMultiple';

type EditCustomMentionGroupProps = {
	_id: string;
	close: () => void;
	onChange: () => void;
};

const EditCustomMentionGroup = ({ _id, close, onChange }: EditCustomMentionGroupProps) => {
	const { t } = useTranslation();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [userIds, setUserIds] = useState<string[]>([]);
	const [nameError, setNameError] = useState('');
	const [membersError, setMembersError] = useState('');
	const [saving, setSaving] = useState(false);

	const setModal = useSetModal();
	const dispatchToastMessage = useToastMessageDispatch();

	const getGroup = useEndpoint('GET', '/v1/custom-mentions.groups.info');
	const getMembers = useEndpoint('GET', '/v1/custom-mentions.groups.members');
	const updateGroup = useEndpoint('PUT', '/v1/custom-mentions.groups.update');
	const deleteGroup = useEndpoint('POST', '/v1/custom-mentions.groups.delete');

	const { data, isLoading } = useQuery({
		queryKey: ['custom-mention-group', _id],
		queryFn: () => getGroup({ groupId: _id } as any),
	});

	const { data: membersData, isLoading: isMembersLoading } = useQuery({
		queryKey: ['custom-mention-group-members', _id],
		queryFn: () => getMembers({ groupId: _id } as any),
	});

	useEffect(() => {
		if (data) {
			setName((data as any).group?.name ?? '');
			setDescription((data as any).group?.description ?? '');
		}
	}, [data]);

	useEffect(() => {
		if (membersData) {
			setUserIds((membersData as any).members.map((m: any) => m.username) ?? []);
		}
	}, [membersData]);

	const handleSave = useCallback(async () => {
		setNameError('');
		setMembersError('');
		if (!name.trim()) {
			setNameError(t('Field_required'));
			return;
		}
		if (userIds.length === 0) {
			setMembersError(t('The_field_is_required', { field: t('Members') }));
			return;
		}
		setSaving(true);
		try {
			await updateGroup({ groupId: _id, name, description, userIds } as any);
			dispatchToastMessage({ type: 'success', message: t('Custom_Mention_Group_Updated_Successfully') });
			onChange();
			close();
		} catch (e: any) {
			dispatchToastMessage({ type: 'error', message: e?.error || t('Something_went_wrong') });
		} finally {
			setSaving(false);
		}
	}, [name, description, userIds, _id, updateGroup, onChange, close, t, dispatchToastMessage]);

	const handleDelete = useCallback(async () => {
		const handleConfirm = async () => {
			try {
				await deleteGroup({ groupId: _id } as any);
				dispatchToastMessage({ type: 'success', message: t('Custom_Mention_Group_Has_Been_Deleted') });
				onChange();
				close();
			} catch (e: any) {
				dispatchToastMessage({ type: 'error', message: e?.error || t('Something_went_wrong') });
			} finally {
				setModal(null);
			}
		};

		const handleCancel = () => setModal(null);

		setModal(
			<GenericModal variant='danger' onConfirm={handleConfirm} onCancel={handleCancel} onClose={handleCancel} confirmText={t('Delete')}>
				{t('Custom_Mention_Group_Delete_Warning')}
			</GenericModal>,
		);
	}, [_id, deleteGroup, onChange, close, dispatchToastMessage, setModal, t]);

	if (isLoading || isMembersLoading) return null;

	return (
		<>
			<ContextualbarScrollableContent>
				<Field>
					<FieldLabel>{t('Name')}</FieldLabel>
					<FieldRow>
						<TextInput
							value={name}
							onChange={(e) => {
								setName((e.target as HTMLInputElement).value);
								setNameError('');
							}}
						/>
					</FieldRow>
					{nameError && <FieldError>{nameError}</FieldError>}
				</Field>
				<Field>
					<FieldLabel>{t('Description')}</FieldLabel>
					<FieldRow>
						<TextInput
							value={description}
							onChange={(e) => {
								setDescription((e.target as HTMLInputElement).value);
							}}
						/>
					</FieldRow>
				</Field>
				<Field>
					<FieldLabel>{t('Members')}</FieldLabel>
					<FieldRow>
						<UserAutoCompleteMultiple
							value={userIds as any}
							onChange={(val) => {
								setUserIds(val as any);
								setMembersError('');
							}}
						/>
					</FieldRow>
					{membersError && <FieldError>{membersError}</FieldError>}
				</Field>
			</ContextualbarScrollableContent>
			<ContextualbarFooter>
				<ButtonGroup stretch>
					<Button onClick={close}>{t('Cancel')}</Button>
					<Button primary disabled={saving} onClick={handleSave}>
						{t('Save')}
					</Button>
				</ButtonGroup>
				<Box mbs={8}>
					<ButtonGroup stretch>
						<Button icon='trash' danger onClick={handleDelete}>
							{t('Delete')}
						</Button>
					</ButtonGroup>
				</Box>
			</ContextualbarFooter>
		</>
	);
};

export default EditCustomMentionGroup;
