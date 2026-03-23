import { usePermission } from '@rocket.chat/ui-contexts';
import type { ReactElement } from 'react';

import NotAuthorizedPage from '../../notAuthorized/NotAuthorizedPage';
import CustomMentionGroupsPage from './CustomMentionGroupsPage';

const CustomMentionGroupsRoute = (): ReactElement => {
    const canView = usePermission('view-custom-mention-groups');
    if (!canView) {
        return <NotAuthorizedPage />;
    }
    return <CustomMentionGroupsPage />;
};

export default CustomMentionGroupsRoute;