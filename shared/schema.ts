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
  name: z.string().optional(),
});

// Conflict matrix entry
export const conflictMatrixEntrySchema = z.object({
  underneath: roomColorSchema,
  onTop: roomColorSchema,
  result: roomColorSchema,
});

// Corner priority schema
export const cornerPrioritySchema = z.enum(['horizontal', 'vertical']);

// Component Template schema - a saved grouping of rooms
export const componentTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  roomIds: z.array(z.string()), // IDs of rooms that belong to this template
  sourceFileId: z.string().optional(), // If imported from another file
});

// Component Instance schema - a placed occurrence of a template
export const componentInstanceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  x: z.number(), // Position of the instance
  y: z.number(),
});

// Link schema - reference to an external published file
export const linkSchema = z.object({
  id: z.string(),
  linkedFileId: z.string(),
  linkedFileName: z.string(),
  importedTemplateIds: z.array(z.string()), // Which templates were imported from this link
  hasUpdates: z.boolean(), // Whether the source file has been updated
});

// File Metadata schema - for published files
export const fileMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  timestamp: z.number(),
  unitCount: z.number(), // Number of component instances
  appState: z.string(), // Serialized application state
});

// Application state schema
export const appStateSchema = z.object({
  rooms: z.array(roomSchema),
  edges: z.array(edgeSchema),
  mode: edgeFightingModeSchema,
  colorPriority: z.array(roomColorSchema),
  conflictMatrix: z.array(conflictMatrixEntrySchema),
  cornerPriorities: z.record(z.string(), cornerPrioritySchema),
  selectedTool: z.enum(['draw', 'move', 'delete', 'select']),
  selectedColor: roomColorSchema,
  selectedRoomId: z.string().optional(),
  selectedEdgeId: z.string().optional(),
  selectedRoomIds: z.array(z.string()).optional(), // For multi-select
  showGrid: z.boolean(),
  fileName: z.string().optional(),
  componentTemplates: z.array(componentTemplateSchema),
  componentInstances: z.array(componentInstanceSchema),
  links: z.array(linkSchema),
});

export type Room = z.infer<typeof roomSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type ConflictMatrixEntry = z.infer<typeof conflictMatrixEntrySchema>;
export type AppState = z.infer<typeof appStateSchema>;
export type RoomColor = z.infer<typeof roomColorSchema>;
export type EdgeFightingMode = z.infer<typeof edgeFightingModeSchema>;
export type CornerPriority = z.infer<typeof cornerPrioritySchema>;
export type ComponentTemplate = z.infer<typeof componentTemplateSchema>;
export type ComponentInstance = z.infer<typeof componentInstanceSchema>;
export type Link = z.infer<typeof linkSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
