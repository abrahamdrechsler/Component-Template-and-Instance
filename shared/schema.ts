import { z } from "zod";

// Room color options - 6 visually distinct colors
export const roomColorSchema = z.enum([
  'skyBlue', 'coralRed', 'goldenYellow', 'mintGreen', 'lavenderPurple', 'slateGray'
]);

// Edge fighting modes
export const edgeFightingModeSchema = z.enum([
  'chronological', 'priority', 'matrix'
]);

// Room schema
export const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  color: roomColorSchema,
  createdAt: z.number(), // timestamp for chronological ordering
});

// Edge schema
export const edgeSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  side: z.enum(['north', 'south', 'east', 'west']),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  colorOverride: roomColorSchema.optional(),
});

// Conflict matrix entry
export const conflictMatrixEntrySchema = z.object({
  underneath: roomColorSchema,
  onTop: roomColorSchema,
  result: roomColorSchema,
});

// Application state schema
export const appStateSchema = z.object({
  rooms: z.array(roomSchema),
  edges: z.array(edgeSchema),
  mode: edgeFightingModeSchema,
  colorPriority: z.array(roomColorSchema),
  conflictMatrix: z.array(conflictMatrixEntrySchema),
  selectedTool: z.enum(['draw', 'move', 'delete']),
  selectedColor: roomColorSchema,
  selectedRoomId: z.string().optional(),
  selectedEdgeId: z.string().optional(),
  showGrid: z.boolean(),
});

export type Room = z.infer<typeof roomSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type ConflictMatrixEntry = z.infer<typeof conflictMatrixEntrySchema>;
export type AppState = z.infer<typeof appStateSchema>;
export type RoomColor = z.infer<typeof roomColorSchema>;
export type EdgeFightingMode = z.infer<typeof edgeFightingModeSchema>;
