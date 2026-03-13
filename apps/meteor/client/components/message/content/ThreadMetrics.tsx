import {
	MessageMetricsItem,
	MessageBlock,
	MessageMetrics,
	MessageMetricsReply,
	MessageMetricsItemIcon,
	MessageMetricsItemLabel,
} from '@rocket.chat/fuselage';
import { useResizeObserver } from '@rocket.chat/fuselage-hooks';
import { useRouter } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import ThreadMetricsFollow from './ThreadMetricsFollow';
import ThreadMetricsParticipants from './ThreadMetricsParticipants';
import { useTimeAgo } from '../../../hooks/useTimeAgo';

type ThreadMetricsProps = {
	unread: boolean;
	mention: boolean;
	all: boolean;
	lm: Date;
	mid: string;
	rid: string;
	counter: number;
	participants: string[];
	following: boolean;
};

const ThreadMetrics = ({ unread, mention, all, rid, mid, counter, participants, following, lm }: ThreadMetricsProps): ReactElement => {
	const { t } = useTranslation();
	const router = useRouter();

	const format = useTimeAgo();

	const { ref, borderBoxSize } = useResizeObserver<HTMLDivElement>();

	const isSmall = (borderBoxSize.inlineSize || Infinity) < 320;

	const handleGoToThread = async () => {
		const routeName = router.getRouteName();

		if (routeName && routeName !== 'activity-center') {
			router.navigate({
				name: routeName,
				params: {
					rid,
					...router.getRouteParameters(),
					tab: 'thread',
					context: mid,
				},
			});
			return;
		}

		const { goToRoomById } = await import('../../../lib/utils/goToRoomById');

		await goToRoomById(rid, {
			routeParamsOverrides: {
				tab: 'thread',
				context: mid,
			},
		});
	};

	return (
		<MessageBlock ref={ref}>
			<MessageMetrics>
				<MessageMetricsReply
					data-rid={rid}
					data-mid={mid}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void handleGoToThread();
					}}
					primary={!!unread}
					position='relative'
					overflow='visible'
				>
					{t('View_thread')}
				</MessageMetricsReply>
				<ThreadMetricsFollow unread={unread} mention={mention} all={all} mid={mid} rid={rid} following={following} />
				{participants?.length > 0 && <ThreadMetricsParticipants participants={participants} />}
				<MessageMetricsItem title={t('Last_message__date__', { date: format(lm) })}>
					<MessageMetricsItemIcon name='thread' />
					{isSmall ? (
						<MessageMetricsItemLabel>{t('__count__replies', { count: counter })}</MessageMetricsItemLabel>
					) : (
						<MessageMetricsItemLabel>{t('__count__replies__date__', { count: counter, date: format(lm) })}</MessageMetricsItemLabel>
					)}
				</MessageMetricsItem>
			</MessageMetrics>
		</MessageBlock>
	);
};

export default ThreadMetrics;
