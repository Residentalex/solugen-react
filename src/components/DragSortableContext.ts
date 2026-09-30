import { createContext } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';

export const DragListenersContext = createContext<DraggableSyntheticListeners | null>(null);
