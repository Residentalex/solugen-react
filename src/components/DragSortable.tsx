import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { HolderOutlined } from '@ant-design/icons';

export const DragListenersContext = React.createContext<any>(null);

export const SortableRow: React.FC<any> = ({ children, ...rest }) => {
  const recordId = rest['data-row-key'];
  if (!recordId) return <tr {...rest}>{children}</tr>;

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: recordId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <DragListenersContext.Provider value={listeners}>
      <tr ref={setNodeRef} style={style} {...attributes} {...rest}>
        {children}
      </tr>
    </DragListenersContext.Provider>
  );
};

export const DragHandle: React.FC = () => {
  const listeners = React.useContext(DragListenersContext);
  return (
    <div
      {...(listeners ?? {})}
      style={{ cursor: 'grab', touchAction: 'none', userSelect: 'none', display: 'inline-flex' }}
    >
      <HolderOutlined style={{ color: '#999' }} />
    </div>
  );
};
