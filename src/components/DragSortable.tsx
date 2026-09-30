import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { HolderOutlined } from '@ant-design/icons';
import { DragListenersContext } from './DragSortableContext';

export type RowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  'data-row-key'?: React.Key;
};

const SortableRowDraggable: React.FC<RowProps & { recordId: React.Key }> = ({
  recordId,
  children,
  ...rest
}) => {
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

export const SortableRow: React.FC<RowProps> = React.memo((props) => {
  const recordId = props['data-row-key'];

  if (!recordId) {
    return <tr {...props} />;
  }

  return <SortableRowDraggable {...props} recordId={recordId} />;
});

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
