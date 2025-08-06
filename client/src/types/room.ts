export interface Point {
  x: number;
  y: number;
}

export interface GridSettings {
  size: number; // pixels per foot
  visible: boolean;
}

export interface CanvasState {
  zoom: number;
  pan: Point;
  isDragging: boolean;
  dragStart: Point | null;
  isDrawing: boolean;
  drawStart: Point | null;
}

export interface EdgeConflict {
  edgeId: string;
  conflictingRoomId: string;
  resolvedColor: string;
  resolution: 'chronological' | 'priority' | 'matrix';
}

export const ROOM_COLORS = {
  red: '#F44336',
  pink: '#E91E63',
  purple: '#9C27B0',
  deepPurple: '#673AB7',
  indigo: '#3F51B5',
  blue: '#2196F3',
  cyan: '#00BCD4',
  teal: '#009688',
  green: '#4CAF50',
  orange: '#FF9800',
} as const;

export const DEFAULT_COLOR_PRIORITY = [
  'red', 'blue', 'green', 'orange', 'purple',
  'pink', 'deepPurple', 'indigo', 'cyan', 'teal'
] as const;
