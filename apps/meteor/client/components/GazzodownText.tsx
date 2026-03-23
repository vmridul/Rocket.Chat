import { Box } from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { ChannelMention, UserMention } from '@rocket.chat/gazzodown';
import { MarkupInteractionContext } from '@rocket.chat/gazzodown';
import { escapeRegExp } from '@rocket.chat/string-helpers';
import { GenericModal } from '@rocket.chat/ui-client';
import { UserAvatar } from '@rocket.chat/ui-avatar';
import { useLayout, useRouter, useUserPreference, useUserId, useUserCard, useSetModal } from '@rocket.chat/ui-contexts';
import type { UIEvent } from 'react';
import { useCallback, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { detectEmoji } from '../lib/utils/detectEmoji';
import { fireGlobalEvent } from '../lib/utils/fireGlobalEvent';
import { useMessageListHighlights, useMessageListShowRealName } from './message/list/MessageListContext';
import { useGoToRoom } from '../views/room/hooks/useGoToRoom';
import { IRoom } from '@rocket.chat/core-typings';

type GazzodownTextProps = {
	children: JSX.Element;
	mentions?: {
		type?: 'user' | 'team';
		_id: string;
		username?: string;
		name?: string;
	}[];
	channels?: Pick<IRoom, '_id' | 'name'>[];
	searchText?: string;
	customMentions?: {
		groupId: string;
		groupName: string;
		description?: string;
		resolvedUserIds: string[];
		resolvedUsernames: string[];
	}[];
};

const GazzodownText = ({ mentions, channels, searchText, children, customMentions }: GazzodownTextProps) => {
	const { t } = useTranslation();
	const [userLanguage] = useLocalStorage('userLanguage', 'en');

	const highlights = useMessageListHighlights();
	const { triggerProps, openUserCard } = useUserCard();
	const setModal = useSetModal();

	const highlightRegex = useMemo(() => {
		if (!highlights?.length) {
			return;
		}

		// Due to unnecessary escaping in escapeRegExp, we need to remove the escape character for the following characters: - = ! :
		// This is necessary because it was crashing the client due to Invalid regular expression error.
		const alternatives = highlights.map(({ highlight }) => escapeRegExp(highlight).replace(/\\([-=!:])/g, '$1')).join('|');
		const expression = `(?<=^|[\\p{P}\\p{Z}])(${alternatives})(?=$|[\\p{P}\\p{Z}])`;

		return (): RegExp => new RegExp(expression, 'gmiu');
	}, [highlights]);

	const markRegex = useMemo(() => {
		if (!searchText) {
			return;
		}

		return (): RegExp => new RegExp(`(${searchText})(?![^<]*>)`, 'gi');
	}, [searchText]);

	const convertAsciiToEmoji = useUserPreference<boolean>('convertAsciiEmoji', true);
	const useEmoji = Boolean(useUserPreference('useEmojis'));
	const useRealName = useMessageListShowRealName();
	const ownUserId = useUserId();
	const showMentionSymbol = Boolean(useUserPreference<boolean>('mentionsWithSymbol'));

	const resolveUserMention = useCallback(
		(mention: string) => {
			if (mention === 'all' || mention === 'here') {
				return undefined;
			}

			// Check if this mention matches a custom mention group
			const customGroup = customMentions?.find((g) => g.groupName === mention);
			if (customGroup) {
				// Return a synthetic mention object so gazzodown highlights it
				return {
					_id: customGroup.groupId,
					username: customGroup.groupName,
					name: customGroup.groupName,
					type: 'group' as const,
					resolvedUsernames: customGroup.resolvedUsernames,
				};
			}

			const normalizedMention = mention.startsWith('@') ? mention.substring(1) : mention;
			const filterUser = ({ username, type }: UserMention) => {
				if (!username || type === 'team') return false;
				const normalizedUsername = username.startsWith('@') ? username.substring(1) : username;
				return normalizedUsername === normalizedMention;
			};
			const filterTeam = ({ name, type }: UserMention) => type === 'team' && name === mention;

			return mentions?.find((mention) => filterUser(mention) || filterTeam(mention));
		},
		[mentions, customMentions],
	);

	const onUserMentionClick = useCallback(
		(mention: UserMention) => {
			if (!mention.username) {
				return;
			}

			if ((mention.type as any) === 'group') {
				const customGroup = customMentions?.find((g) => g.groupName === mention.username);
				if (customGroup) {
					return (event: UIEvent): void => {
						event.stopPropagation();
						setModal(
							<GenericModal
								title={`${customGroup.groupName} · ${customGroup.resolvedUsernames.length} ${t('Members')}`}
								icon={null}
								onConfirm={() => setModal(null)}
								onClose={() => setModal(null)}
								confirmText={t('Close')}
							>
								<Box is='ul' style={{ listStyle: 'none', padding: 0 }}>
									{customGroup.resolvedUsernames.map((username) => (
										<Box is='li' key={username} display='flex' alignItems='center' mb={8}>
											<UserAvatar size='x24' username={username} />
											<Box marginInlineStart={8}>{username}</Box>
										</Box>
									))}
								</Box>
							</GenericModal>,
						);
					};
				}
			}

			return (event: UIEvent): void => {
				event.stopPropagation();
				openUserCard(event, mention.username!);
			};
		},
		[openUserCard, customMentions, setModal, t],
	);

	const goToRoom = useGoToRoom();

	const { isEmbedded, isMobile } = useLayout();

	const resolveChannelMention = useCallback((mention: string) => channels?.find(({ name }) => name === mention), [channels]);

	const router = useRouter();

	const onChannelMentionClick = useCallback(
		({ _id: rid }: ChannelMention) =>
			(event: UIEvent): void => {
				if (isEmbedded) {
					fireGlobalEvent('click-mention-link', {
						path: router.buildRoutePath({
							pattern: '/channel/:name/:tab?/:context?',
							params: { name: rid },
						}),
						channel: rid,
					});
				}

				event.stopPropagation();
				goToRoom(rid);
			},
		[router, isEmbedded, goToRoom],
	);

	return (
		<MarkupInteractionContext.Provider
			value={{
				detectEmoji,
				highlightRegex,
				markRegex,
				resolveUserMention,
				onUserMentionClick,
				resolveChannelMention,
				onChannelMentionClick,
				convertAsciiToEmoji,
				useEmoji,
				useRealName,
				isMobile,
				ownUserId,
				showMentionSymbol,
				triggerProps,
				language: userLanguage,
			}}
		>
			{children}
		</MarkupInteractionContext.Provider>
	);
};

export default memo(GazzodownText);
