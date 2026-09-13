import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { HolderOutlined } from '@ant-design/icons';
export const DragListenersContext = React.createContext(null);
export const SortableRow = React.memo(({ children, ...rest }) => {
    const recordId = rest['data-row-key'];
    if (!recordId)
        return _jsx("tr", { ...rest, children: children });
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: recordId });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    return (_jsx(DragListenersContext.Provider, { value: listeners, children: _jsx("tr", { ref: setNodeRef, style: style, ...attributes, ...rest, children: children }) }));
});
export const DragHandle = () => {
    const listeners = React.useContext(DragListenersContext);
    return (_jsx("div", { ...(listeners ?? {}), style: { cursor: 'grab', touchAction: 'none', userSelect: 'none', display: 'inline-flex' }, children: _jsx(HolderOutlined, { style: { color: '#999' } }) }));
};
