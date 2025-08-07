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
  dragStartOffset?: Point;
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
  red: '#E53E3E',     // Bright red - highly visible
  yellow: '#F6E05E',  // Bright yellow - highly visible
  blue: '#3182CE',    // Bright blue - highly visible
  green: '#38A169',   // Bright green - highly visible
  purple: '#9F7AEA',  // Bright purple - highly visible
  pink: '#ED64A6',    // Bright pink - highly visible
} as const;

export const DEFAULT_COLOR_PRIORITY = [
  'red', 'yellow', 'blue', 'green', 'purple', 'pink'
] as const;
