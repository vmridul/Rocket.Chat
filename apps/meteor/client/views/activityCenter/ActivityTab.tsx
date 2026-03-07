import type { IMessage } from '@rocket.chat/core-typings';
import { Box, MessageDivider, Throbber, Button, ButtonGroup, IconButton } from '@rocket.chat/fuselage';
import type { Keys as IconName } from '@rocket.chat/icons';
import { MessageTypes } from '@rocket.chat/message-types';
import { VirtualizedScrollbars, ContextualbarContent, ContextualbarEmptyContent } from '@rocket.chat/ui-client';
import { useUserPreference } from '@rocket.chat/ui-contexts';
import { useMutation } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

import type { MessageActionContext } from '../../../app/ui-utils/client/lib/MessageAction';
import RoomMessage from '../../components/message/variants/RoomMessage';
import SystemMessage from '../../components/message/variants/SystemMessage';
import { useFormatDate } from '../../hooks/useFormatDate';
import { isMessageNewDay } from '../room/MessageList/lib/isMessageNewDay';

type ActivityTabProps = {
	iconName: IconName;
	title: string;
	emptyResultMessage: string;
	context: MessageActionContext;
	queryResult: UseQueryResult<IMessage[]>;
	onUnstarMessage?: (messageId: string) => Promise<void>;
	onClearHistory?: () => Promise<void>;
};

const ActivityTab = ({ emptyResultMessage, context, queryResult, onUnstarMessage, onClearHistory }: ActivityTabProps): ReactElement => {
	const formatDate = useFormatDate();
	const showUserAvatar = !!useUserPreference<boolean>('displayAvatars');
	const { t } = useTranslation();

	// Mutation for unstarring individual messages
	const unstarMessageMutation = useMutation({
		mutationFn: async (messageId: string) => {
			if (!onUnstarMessage) throw new Error('Unstar not supported');
			await onUnstarMessage(messageId);
		},
		onSuccess: async () => {
			// Refetch the query after successful unstar
			if (queryResult.refetch) {
				await queryResult.refetch();
			}
		},
	});

	// Mutation for clearing all history
	const clearHistoryMutation = useMutation({
		mutationFn: async () => {
			if (!onClearHistory) throw new Error('Clear history not supported');
			await onClearHistory();
		},
		onSuccess: async () => {
			if (queryResult.refetch) {
				await queryResult.refetch();
			}
		},
	});

	const handleUnstarMessage = useCallback(
		async (messageId: string) => {
			if (!onUnstarMessage) return;
			await unstarMessageMutation.mutateAsync(messageId);
		},
		[onUnstarMessage, unstarMessageMutation],
	);

	const handleClearHistory = useCallback(async () => {
		if (!onClearHistory) return;

		const confirmed = window.confirm(t('Activity_Center_Clear_History_Confirm'));
		if (!confirmed) return;

		await clearHistoryMutation.mutateAsync();
	}, [onClearHistory, clearHistoryMutation, t]);

	return (
		<Box display='flex' flexDirection='column' height='full'>
			{/* Toolbar with clear button */}
			{queryResult.isSuccess && queryResult.data.length > 0 && onClearHistory && (
				<Box padding={16} borderInlineEndColor='neutral-200' borderInlineEndStyle='solid' borderInlineEndWidth='x1'>
					<ButtonGroup>
						<Button
							disabled={clearHistoryMutation.isPending}
							onClick={handleClearHistory}
							title={t('Activity_Center_Clear_History')}
							danger
						>
							{t('Clear_History')}
						</Button>
					</ButtonGroup>
				</Box>
			)}

			{/* Content area */}
			<ContextualbarContent flexShrink={1} flexGrow={1} paddingInline={0} overflow='hidden'>
				{queryResult.isLoading && (
					<Box paddingInline={24} paddingBlock={12}>
						<Throbber size='x12' />
					</Box>
				)}
				{queryResult.isSuccess && (
					<>
						{queryResult.data.length === 0 && <ContextualbarEmptyContent title={emptyResultMessage} />}

						{queryResult.data.length > 0 && (
							<Box is='section' display='flex' flexDirection='column' flexGrow={1} flexShrink={1} flexBasis='auto' height='full'>
								<VirtualizedScrollbars>
									<Virtuoso
										totalCount={queryResult.data.length}
										overscan={25}
										data={queryResult.data}
										itemContent={(index, message) => {
											const previous = queryResult.data[index - 1];
											const newDay = isMessageNewDay(message, previous);
											const system = MessageTypes.isSystemMessage(message);

											return (
												<Box display='flex' flexDirection='row' alignItems='stretch' key={message._id}>
													<Box flexGrow={1} overflow='hidden'>
														<>
															{newDay && <MessageDivider>{formatDate(message.ts)}</MessageDivider>}

															{system ? (
																<SystemMessage message={message} showUserAvatar={showUserAvatar} />
															) : (
																<Box display='flex' flexDirection='row' alignItems='center' paddingInline={8}>
																	<Box flexGrow={1} overflow='hidden'>
																		<RoomMessage
																			message={message}
																			sequential={false}
																			unread={false}
																			mention={false}
																			all={false}
																			context={context}
																			showUserAvatar={showUserAvatar}
																		/>
																	</Box>
																	{onUnstarMessage && (
																		<IconButton
																			disabled={unstarMessageMutation.isPending}
																			icon='star-filled'
																			small
																			title={t('Unstar')}
																			onClick={() => handleUnstarMessage(message._id)}
																		/>
																	)}
																</Box>
															)}
														</>
													</Box>
												</Box>
											);
										}}
									/>
								</VirtualizedScrollbars>
							</Box>
						)}
					</>
				)}
			</ContextualbarContent>
		</Box>
	);
};

export default ActivityTab;
