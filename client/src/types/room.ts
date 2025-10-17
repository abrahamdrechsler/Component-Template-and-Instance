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
  isDraggingOrigin?: boolean;
}

export interface EdgeConflict {
  edgeId: string;
  conflictingRoomId: string;
  resolvedColor: string;
  resolution: 'chronological' | 'priority' | 'matrix';
}

export const ROOM_COLORS = {
  skyBlue: '#4FC3F7',          // Sky Blue
  coralRed: '#FF6B6B',         // Coral Red
  goldenYellow: '#FFD54F',     // Golden Yellow
  mintGreen: '#81C784',        // Mint Green
  lavenderPurple: '#BA68C8',   // Lavender Purple
  slateGray: '#546E7A',        // Slate Gray
} as const;

export const DEFAULT_COLOR_PRIORITY = [
  'skyBlue', 'coralRed', 'goldenYellow', 'mintGreen', 'lavenderPurple', 'slateGray'
] as const;
