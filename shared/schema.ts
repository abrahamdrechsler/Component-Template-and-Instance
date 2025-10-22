import { z } from "zod";

// Room color options - 6 visually distinct colors
export const roomColorSchema = z.enum([
  'skyBlue', 'coralRed', 'goldenYellow', 'mintGreen', 'lavenderPurple', 'slateGray'
]);

// Edge fighting modes
export const edgeFightingModeSchema = z.enum([
  'chronological', 'priority', 'matrix'
]);

// Room condition schema - logical condition based on option values
export const roomConditionSchema = z.object({
  id: z.string(),
  optionId: z.string(),
  valueId: z.string(),
  operator: z.enum(['equals', 'notEquals']),
  isSpecial: z.boolean().optional(), // Special conditions create per-instance options
});

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
  conditions: z.array(roomConditionSchema).optional(), // Optional conditions for this room
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
  originX: z.number(), // X coordinate of the template's origin point
  originY: z.number(), // Y coordinate of the template's origin point
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

// Option Value schema - a possible value for an option
export const optionValueSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// Option schema - a configurable option with multiple values
export const optionSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(optionValueSchema).min(2), // At least 2 values required
});

// Option Component schema - a component that groups multiple options
export const optionComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  optionIds: z.array(z.string()), // IDs of options included in this component
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
  options: z.array(optionSchema),
  activeOptionState: z.record(z.string(), z.string()), // Maps option ID to selected value ID
  optionComponents: z.array(optionComponentSchema).optional(),
});

export type Room = z.infer<typeof roomSchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type RoomCondition = z.infer<typeof roomConditionSchema>;
export type ConflictMatrixEntry = z.infer<typeof conflictMatrixEntrySchema>;
export type AppState = z.infer<typeof appStateSchema>;
export type RoomColor = z.infer<typeof roomColorSchema>;
export type EdgeFightingMode = z.infer<typeof edgeFightingModeSchema>;
export type CornerPriority = z.infer<typeof cornerPrioritySchema>;
export type ComponentTemplate = z.infer<typeof componentTemplateSchema>;
export type ComponentInstance = z.infer<typeof componentInstanceSchema>;
export type Link = z.infer<typeof linkSchema>;
export type FileMetadata = z.infer<typeof fileMetadataSchema>;
export type Option = z.infer<typeof optionSchema>;
export type OptionValue = z.infer<typeof optionValueSchema>;
export type OptionComponent = z.infer<typeof optionComponentSchema>;

// Utility function to check if a room should be visible based on its conditions
// If instanceId is provided and the condition is special, check instance-specific option first
export function isRoomVisible(room: Room, activeOptionState: Record<string, string>, instanceId?: string): boolean {
  // If room has no conditions, it's always visible
  if (!room.conditions || room.conditions.length === 0) {
    return true;
  }

  // All conditions must be satisfied (AND logic)
  return room.conditions.every(condition => {
    // For special conditions on instance rooms, check instance-specific option first
    let activeValueId: string | undefined;
    
    if (condition.isSpecial && instanceId) {
      // Check instance-specific option: ${instanceId}-${optionId}
      const instanceOptionKey = `${instanceId}-${condition.optionId}`;
      activeValueId = activeOptionState[instanceOptionKey];
    }
    
    // Fall back to general option if no instance-specific value found
    if (!activeValueId) {
      activeValueId = activeOptionState[condition.optionId];
    }
    
    // If the option isn't in active state, the condition can't be evaluated
    // In this case, we'll consider the room visible (fail-open)
    if (!activeValueId) {
      return true;
    }

    if (condition.operator === 'equals') {
      return activeValueId === condition.valueId;
    } else if (condition.operator === 'notEquals') {
      return activeValueId !== condition.valueId;
    }

    return true;
  });
}