import { Box } from '@rocket.chat/fuselage';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { OptionContent, OptionColumn, OptionInput } from '@rocket.chat/fuselage';

export type ComposerBoxPopupCustomMentionGroupProps = {
	_id: string;
	name: string;
	description?: string;
	userIds: string[];
	isCustomMentionGroup: true;
};

const ComposerBoxPopupCustomMentionGroup = ({ name, description, userIds }: ComposerBoxPopupCustomMentionGroupProps): ReactElement => {
	const { t } = useTranslation();

	return (
		<Box display='flex' alignItems='center' justifyContent='space-between' width='full'>
			<OptionContent>
				<strong>@{name}</strong> {description}
			</OptionContent>
			<OptionColumn>
				<OptionInput>
					{userIds.length} {t('Members')}
				</OptionInput>
			</OptionColumn>
		</Box>
	);
};

export default ComposerBoxPopupCustomMentionGroup;
