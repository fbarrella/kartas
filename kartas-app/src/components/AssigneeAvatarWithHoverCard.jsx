import React, { useState } from 'react';
import {
    useFloating, useHover, useDismiss, useInteractions,
    offset, flip, shift, safePolygon, FloatingPortal
} from '@floating-ui/react';
import AssigneeAvatar from './AssigneeAvatar';
import UserHoverCard from './UserHoverCard';

const AssigneeAvatarWithHoverCard = ({ assigneeId, assigneeName, assigneeRole, assigneeEmail, projectId }) => {
    const [open, setOpen] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: 'right-start',
        middleware: [offset(8), flip(), shift({ padding: 8 })],
    });

    const hover = useHover(context, { handleClose: safePolygon(), delay: { open: 150, close: 0 } });
    const dismiss = useDismiss(context);
    const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss]);

    if (!assigneeName) {
        // Unassigned items keep the plain dashed "?" circle, no hover wiring attached.
        return <AssigneeAvatar assigneeId={assigneeId} assigneeName={assigneeName} />;
    }

    return (
        <>
            <span ref={refs.setReference} {...getReferenceProps()} style={{ display: 'inline-flex' }}>
                <AssigneeAvatar assigneeId={assigneeId} assigneeName={assigneeName} />
            </span>
            {open && (
                <FloatingPortal>
                    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 1000 }} {...getFloatingProps()}>
                        <UserHoverCard
                            assigneeId={assigneeId}
                            assigneeName={assigneeName}
                            assigneeRole={assigneeRole}
                            assigneeEmail={assigneeEmail}
                            projectId={projectId}
                        />
                    </div>
                </FloatingPortal>
            )}
        </>
    );
};

export default AssigneeAvatarWithHoverCard;
