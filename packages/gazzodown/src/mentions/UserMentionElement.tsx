import { MessageHighlight } from '@rocket.chat/fuselage';
import { useButtonPattern } from '@rocket.chat/fuselage-hooks';
import type { ReactElement } from 'react';
import { memo, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { MarkupInteractionContext } from '../MarkupInteractionContext';

type UserMentionElementProps = {
	mention: string;
};

const handleUserMention = (mention: string | undefined, withSymbol: boolean | undefined): string | undefined =>
	withSymbol ? `@${mention}` : mention;

const UserMentionElement = ({ mention }: UserMentionElementProps): ReactElement => {
	const { t } = useTranslation();
	const { resolveUserMention, onUserMentionClick, ownUserId, useRealName, showMentionSymbol, triggerProps } =
		useContext(MarkupInteractionContext);

	const resolved = useMemo(() => resolveUserMention?.(mention), [mention, resolveUserMention]);
	const handleClick = useMemo(() => (resolved ? onUserMentionClick?.(resolved) : undefined), [resolved, onUserMentionClick]);
	const buttonProps = useButtonPattern((e) => handleClick?.(e));

	const title = useMemo(() => {
		if (mention === 'all') return t('Mentions_all_room_members');
		if (mention === 'here') return t('Mentions_online_room_members');
		if ((resolved as any)?.type === 'group')
			return `${t('Mentions_Group')} · ${(resolved as any).resolvedUsernames?.length} ${t('Members')}`;
		if (resolved?._id === ownUserId) return t('Mentions_you');
		return t('Mentions_user');
	}, [mention, resolved, ownUserId, t]);

	if (mention === 'all') {
		return (
			<MessageHighlight title={title} variant='relevant'>
				{handleUserMention('all', showMentionSymbol)}
			</MessageHighlight>
		);
	}

	if (mention === 'here') {
		return (
			<MessageHighlight title={title} variant='relevant'>
				{handleUserMention('here', showMentionSymbol)}
			</MessageHighlight>
		);
	}

	if (!resolved) {
		return <>@{mention}</>;
	}

	return (
		<MessageHighlight
			variant={(resolved as any)?.type === 'group' ? 'relevant' : resolved._id === ownUserId ? 'critical' : 'other'}
			title={title}
			clickable
			{...buttonProps}
			{...triggerProps}
			data-uid={resolved._id}
		>
			{handleUserMention((useRealName ? resolved.name : resolved.username) ?? mention, showMentionSymbol)}
		</MessageHighlight>
	);
};

export default memo(UserMentionElement);
