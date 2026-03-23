import { Button, ButtonGroup, Field, FieldLabel, FieldRow, FieldError, TextInput } from '@rocket.chat/fuselage';
import { ContextualbarScrollableContent, ContextualbarFooter } from '@rocket.chat/ui-client';
import { useEndpoint, useToastMessageDispatch } from '@rocket.chat/ui-contexts';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import UserAutoCompleteMultiple from '../../../components/UserAutoCompleteMultiple';

type AddCustomMentionGroupProps = {
	close: () => void;
	onChange: () => void;
	goToNew: (id: string) => () => void;
};

const AddCustomMentionGroup = ({ close, onChange, goToNew }: AddCustomMentionGroupProps) => {
	const { t } = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [userIds, setUserIds] = useState<string[]>([]);
	const [nameError, setNameError] = useState('');
	const [membersError, setMembersError] = useState('');
	const [saving, setSaving] = useState(false);

	const createGroup = useEndpoint('POST', '/v1/custom-mentions.groups.create');

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
			const result = await createGroup({ name, description, userIds } as any);
			dispatchToastMessage({ type: 'success', message: t('Custom_Mention_Group_Created_Successfully') });
			onChange();
			goToNew((result as any).group._id)();
		} catch (e: any) {
			dispatchToastMessage({ type: 'error', message: e?.error || t('Something_went_wrong') });
		} finally {
			setSaving(false);
		}
	}, [name, description, userIds, createGroup, onChange, goToNew, t, dispatchToastMessage]);

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
							placeholder={t('Custom_Mention_Group_Name_Placeholder')}
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
					<Button primary onClick={handleSave}>
						{t('Save')}
					</Button>
				</ButtonGroup>
			</ContextualbarFooter>
		</>
	);
};

export default AddCustomMentionGroup;
