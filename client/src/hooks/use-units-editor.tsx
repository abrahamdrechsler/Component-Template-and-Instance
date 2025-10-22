import { useState, useCallback, useRef } from 'react';
import { Room, Edge, ConflictMatrixEntry, RoomColor, EdgeFightingMode, CornerPriority, ComponentTemplate, ComponentInstance, Link, Option, OptionValue, OptionComponent, isRoomVisible } from '@shared/schema';
import { ROOM_COLORS } from '@/types/room';
import { CanvasUtils } from '@/lib/canvas-utils';
import { EdgeFightingResolver } from '@/lib/edge-fighting';
import { RoomValidation } from '@/lib/room-validation';

export type CreationMode = 'template-is-first-instance' | 'all-instances-are-templates' | 'template-is-separate-file' | 'template-always-live';
export type OptionMode = 'option-component' | 'special-option';

export interface UseUnitsEditorReturn {
  rooms: Room[];
  edges: Edge[];
  mode: EdgeFightingMode;
  colorPriority: RoomColor[];
  conflictMatrix: ConflictMatrixEntry[];
  cornerPriorities: Record<string, CornerPriority>;
  selectedTool: 'draw' | 'move' | 'delete' | 'select';
  selectedColor: RoomColor;
  selectedRoomId: string | undefined;
  selectedEdgeId: string | undefined;
  selectedRoomIds: string[];
  selectedInstanceId: string | undefined;
  selectedTemplateId: string | undefined;
  showGrid: boolean;
  fileName: string;
  componentTemplates: ComponentTemplate[];
  componentInstances: ComponentInstance[];
  links: Link[];
  options: Option[];
  activeOptionState: Record<string, string>;
  selectedOptionId: string | undefined;
  creationMode: CreationMode;
  optionMode: OptionMode;
  isEditingTemplate: boolean;
  editingTemplateId: string | undefined;
  editingInstanceId: string | undefined;
  isSelectingOrigin: boolean;
  templateOriginX: number | undefined;
  templateOriginY: number | undefined;
  newRoomsInEdit: string[];
  
  addRoom: (x: number, y: number, width: number, height: number) => void;
  deleteRoom: (roomId: string) => void;
  moveRoom: (roomId: string, x: number, y: number) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  setMode: (mode: EdgeFightingMode) => void;
  setColorPriority: (priority: RoomColor[]) => void;
  setConflictMatrix: (matrix: ConflictMatrixEntry[]) => void;
  setSelectedTool: (tool: 'draw' | 'move' | 'delete' | 'select') => void;
  setSelectedColor: (color: RoomColor) => void;
  setSelectedRoomId: (roomId: string | undefined) => void;
  setSelectedEdgeId: (edgeId: string | undefined) => void;
  setSelectedRoomIds: (roomIds: string[]) => void;
  setSelectedInstanceId: (instanceId: string | undefined) => void;
  setSelectedTemplateId: (templateId: string | undefined) => void;
  setShowGrid: (show: boolean) => void;
  setFileName: (name: string) => void;
  setCreationMode: (mode: CreationMode) => void;
  setOptionMode: (mode: OptionMode) => void;
  toggleCornerPriority: (x: number, y: number) => void;
  exportData: () => void;
  importData: (data: any) => void;
  getEdgeColor: (edge: Edge) => string;
  getRoomAt: (x: number, y: number) => Room | undefined;
  getEdgeAt: (x: number, y: number) => Edge | undefined;
  getInstanceAt: (x: number, y: number) => ComponentInstance | undefined;
  getTemplateAt: (x: number, y: number) => ComponentTemplate | undefined;
  
  createTemplate: (name: string, roomIds: string[]) => void;
  startOriginSelection: (name: string, roomIds: string[]) => void;
  selectOrigin: (x: number, y: number) => void;
  cancelOriginSelection: () => void;
  setTemplateOrigin: (x: number, y: number) => void;
  updateTemplateOrigin: (templateId: string, x: number, y: number) => void;
  deleteTemplate: (templateId: string) => void;
  updateTemplate: (templateId: string, updates: Partial<ComponentTemplate>) => void;
  placeInstance: (templateId: string, x: number, y: number) => void;
  moveInstance: (instanceId: string, x: number, y: number) => void;
  moveTemplate: (templateId: string, deltaX: number, deltaY: number) => void;
  deleteInstance: (instanceId: string) => void;
  duplicateInstance: (instanceId: string) => void;
  addLink: (linkedFileId: string, linkedFileName: string) => void;
  removeLink: (linkId: string) => void;
  importTemplatesFromLink: (linkId: string, templateIds: string[]) => void;
  updateLinkStatus: (linkId: string, hasUpdates: boolean) => void;
  enterTemplateEditMode: (templateId: string, instanceId?: string) => void;
  exitTemplateEditMode: () => void;
  saveTemplateEdits: () => void;
  discardTemplateEdits: () => void;
  
  createOption: (name: string) => void;
  updateOption: (optionId: string, name: string) => void;
  deleteOption: (optionId: string) => void;
  addOptionValue: (optionId: string, name: string) => void;
  updateOptionValue: (optionId: string, valueId: string, name: string) => void;
  deleteOptionValue: (optionId: string, valueId: string) => void;
  setActiveOptionValue: (optionId: string, valueId: string) => void;
  setSelectedOptionId: (optionId: string | undefined) => void;
  
  optionComponents: OptionComponent[];
  selectedOptionComponentId: string | undefined;
  createOptionComponent: (name: string) => void;
  updateOptionComponent: (optionComponentId: string, name: string) => void;
  deleteOptionComponent: (optionComponentId: string) => void;
  addOptionToComponent: (optionComponentId: string, optionId: string) => void;
  removeOptionFromComponent: (optionComponentId: string, optionId: string) => void;
  setSelectedOptionComponentId: (optionComponentId: string | undefined) => void;
  getSpecialOptions: () => Array<{ option: Option; instances: ComponentInstance[] }>;
}

export function useUnitsEditor(): UseUnitsEditorReturn {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<EdgeFightingMode>('chronological');
  const [colorPriority, setColorPriority] = useState<RoomColor[]>([]);
  const [conflictMatrix, setConflictMatrix] = useState<ConflictMatrixEntry[]>([]);
  const [selectedTool, setSelectedTool] = useState<'draw' | 'move' | 'delete' | 'select'>('draw');
  const [selectedColor, setSelectedColor] = useState<RoomColor>('skyBlue');
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>();
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | undefined>();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [showGrid, setShowGrid] = useState(true);
  const [cornerPriorities, setCornerPriorities] = useState<Record<string, CornerPriority>>({});
  const [fileName, setFileName] = useState('Untitled Project');
  const [componentTemplates, setComponentTemplates] = useState<ComponentTemplate[]>([]);
  const [componentInstances, setComponentInstances] = useState<ComponentInstance[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [activeOptionState, setActiveOptionState] = useState<Record<string, string>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();
  const [optionComponents, setOptionComponents] = useState<OptionComponent[]>([]);
  const [selectedOptionComponentId, setSelectedOptionComponentId] = useState<string | undefined>();
  const [creationMode, setCreationMode] = useState<CreationMode>('template-is-first-instance');
  const [optionMode, setOptionMode] = useState<OptionMode>('option-component');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>();
  const [editingInstanceId, setEditingInstanceId] = useState<string | undefined>();
  const [preEditState, setPreEditState] = useState<{ rooms: Room[], edges: Edge[], templates: ComponentTemplate[] } | null>(null);
  const [newRoomsInEdit, setNewRoomsInEdit] = useState<string[]>([]); // Track new rooms created during editing
  const [isSelectingOrigin, setIsSelectingOrigin] = useState(false);
  const [pendingTemplateName, setPendingTemplateName] = useState('');
  const [pendingTemplateRoomIds, setPendingTemplateRoomIds] = useState<string[]>([]);
  const [templateOriginX, setTemplateOriginX] = useState<number | undefined>();
  const [templateOriginY, setTemplateOriginY] = useState<number | undefined>();

  const nextRoomIdRef = useRef(1);
  const nextTemplateIdRef = useRef(1);
  const nextInstanceIdRef = useRef(1);
  const nextLinkIdRef = useRef(1);
  const nextOptionIdRef = useRef(1);
  const nextOptionValueIdRef = useRef(1);
  const nextOptionComponentIdRef = useRef(1);

  const updateColorPriorityForUsedColors = useCallback((roomList: Room[], edgeList?: Edge[]) => {
    const usedColorsSet = new Set(roomList.map(room => room.color));
    
    if (edgeList) {
      edgeList.forEach(edge => {
        if (edge.colorOverride) {
          usedColorsSet.add(edge.colorOverride);
        }
      });
    }
    
    const usedColors = Array.from(usedColorsSet);
    const newPriority = colorPriority.filter(color => usedColorsSet.has(color));
    
    usedColors.forEach(color => {
      if (!newPriority.includes(color)) {
        newPriority.push(color);
      }
    });
    
    if (newPriority.length !== colorPriority.length || 
        !newPriority.every((color, index) => color === colorPriority[index])) {
      setColorPriority(newPriority);
    }
  }, [colorPriority]);

  const addRoom = useCallback((x: number, y: number, width: number, height: number) => {
    const roomId = `room-${nextRoomIdRef.current++}`;
    const newRoom: Room = {
      id: roomId,
      name: `Room ${nextRoomIdRef.current - 1}`,
      x,
      y,
      width,
      height,
      color: selectedColor,
      createdAt: Date.now(),
    };

    // No collision detection - rooms can overlap freely
    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms);
    
    // If we're in template editing mode, track this new room
    if (isEditingTemplate && editingTemplateId) {
      setNewRoomsInEdit(prev => [...prev, roomId]);
    }
    
    // Filter to only visible rooms for edge generation
    const visibleRooms = updatedRooms.filter(r => isRoomVisible(r, activeOptionState));
    
    const allEdges: Edge[] = [];
    for (const room of visibleRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, visibleRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
    
    updateColorPriorityForUsedColors(updatedRooms, allEdges);
    
    // Select the newly created room
    setSelectedEdgeId(undefined);
    setSelectedRoomId(roomId);
  }, [selectedColor, rooms, updateColorPriorityForUsedColors, isEditingTemplate, editingTemplateId, componentTemplates, newRoomsInEdit, activeOptionState]);

  const deleteRoom = useCallback((roomId: string) => {
    const updatedRooms = rooms.filter(room => room.id !== roomId);
    setRooms(updatedRooms);
    
    // Filter to only visible rooms for edge generation
    const visibleRooms = updatedRooms.filter(r => isRoomVisible(r, activeOptionState));
    
    const allEdges: Edge[] = [];
    for (const room of visibleRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, visibleRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
    
    updateColorPriorityForUsedColors(updatedRooms, allEdges);
    
    if (selectedRoomId === roomId) {
      setSelectedRoomId(undefined);
    }
    
    setSelectedRoomIds(prev => prev.filter(id => id !== roomId));
  }, [selectedRoomId, rooms, updateColorPriorityForUsedColors, activeOptionState]);

  const moveRoom = useCallback((roomId: string, x: number, y: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const updatedRooms = rooms.map(room => 
      room.id === roomId ? { ...room, x, y } : room
    );
    setRooms(updatedRooms);
    
    const existingEdgeProps = new Map<string, { colorOverride?: RoomColor; name?: string }>();
    edges.forEach(edge => {
      const key = `${edge.roomId}-${edge.side}`;
      if (edge.colorOverride || edge.name) {
        existingEdgeProps.set(key, {
          colorOverride: edge.colorOverride,
          name: edge.name
        });
      }
    });
    
    // Filter to only visible rooms for edge generation
    const visibleRooms = updatedRooms.filter(r => isRoomVisible(r, activeOptionState));
    
    const allEdges: Edge[] = [];
    for (const room of visibleRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, visibleRooms);
      roomEdges.forEach(edge => {
        const key = `${edge.roomId}-${edge.side}`;
        const preserved = existingEdgeProps.get(key);
        if (preserved) {
          if (preserved.colorOverride) edge.colorOverride = preserved.colorOverride;
          if (preserved.name) edge.name = preserved.name;
        }
      });
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
  }, [rooms, edges, activeOptionState]);

  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    const updatedRooms = rooms.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    );
    setRooms(updatedRooms);
    
    if (updates.color !== undefined) {
      updateColorPriorityForUsedColors(updatedRooms, edges);
    }
    
    // Regenerate edges if position, size, or conditions change
    if (updates.width !== undefined || updates.height !== undefined || 
        updates.x !== undefined || updates.y !== undefined || updates.conditions !== undefined) {
      const existingEdgeProps = new Map<string, { colorOverride?: RoomColor; name?: string }>();
      edges.forEach(edge => {
        const key = `${edge.roomId}-${edge.side}`;
        if (edge.colorOverride || edge.name) {
          existingEdgeProps.set(key, {
            colorOverride: edge.colorOverride,
            name: edge.name
          });
        }
      });
      
      // Filter to only visible rooms for edge generation
      const visibleRooms = updatedRooms.filter(r => isRoomVisible(r, activeOptionState));
      
      const allEdges: Edge[] = [];
      for (const room of visibleRooms) {
        const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, visibleRooms);
        roomEdges.forEach(edge => {
          const key = `${edge.roomId}-${edge.side}`;
          const preserved = existingEdgeProps.get(key);
          if (preserved) {
            if (preserved.colorOverride) edge.colorOverride = preserved.colorOverride;
            if (preserved.name) edge.name = preserved.name;
          }
        });
        allEdges.push(...roomEdges);
      }
      setEdges(allEdges);
    }
  }, [rooms, edges, updateColorPriorityForUsedColors, activeOptionState]);

  const updateEdge = useCallback((edgeId: string, updates: Partial<Edge>) => {
    const updatedEdges = edges.map(edge => 
      edge.id === edgeId ? { ...edge, ...updates } : edge
    );
    setEdges(updatedEdges);
    
    if (updates.colorOverride !== undefined) {
      updateColorPriorityForUsedColors(rooms, updatedEdges);
    }
  }, [edges, rooms, updateColorPriorityForUsedColors]);

  const getEdgeColor = useCallback((edge: Edge): string => {
    // Filter to only visible rooms for edge color resolution
    const visibleRooms = rooms.filter(r => isRoomVisible(r, activeOptionState));
    return EdgeFightingResolver.resolveEdgeColor(
      edge, visibleRooms, mode, colorPriority, conflictMatrix, edges
    );
  }, [rooms, edges, mode, colorPriority, conflictMatrix, activeOptionState]);

  const getRoomAt = useCallback((x: number, y: number): Room | undefined => {
    return rooms.find(room => {
      // In template editing mode, only detect editing rooms or template rooms being edited
      if (isEditingTemplate && editingTemplateId) {
        const template = componentTemplates.find(t => t.id === editingTemplateId);
        if (template) {
          // Check if there are temporary editing rooms
          const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
          
          if (hasEditingRooms) {
            // Only allow interaction with temporary editing rooms or new rooms created during editing
            if (!room.id.startsWith('editing-') && !newRoomsInEdit.includes(room.id)) {
              return false;
            }
          } else {
            // No temporary editing rooms - only allow interaction with template rooms or new rooms
            if (!template.roomIds.includes(room.id) && !newRoomsInEdit.includes(room.id)) {
              return false;
            }
          }
        }
      } else if (creationMode === 'all-instances-are-templates') {
        // In normal "all-instances-are-templates" mode, ignore original template rooms
        const isTemplateRoom = componentTemplates.some(t => t.roomIds.includes(room.id));
        if (isTemplateRoom) {
          return false;
        }
      }
      
      return CanvasUtils.isPointInRoom({ x, y }, room);
    });
  }, [rooms, creationMode, isEditingTemplate, editingTemplateId, componentTemplates, newRoomsInEdit]);

  const getEdgeAt = useCallback((x: number, y: number): Edge | undefined => {
    const tolerance = 0.5;
    return edges.find(edge => {
      // In template editing mode, only detect editing edges or template edges being edited
      if (isEditingTemplate && editingTemplateId) {
        const template = componentTemplates.find(t => t.id === editingTemplateId);
        if (template) {
          // Check if there are temporary editing rooms
          const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
          
          if (hasEditingRooms) {
            // Only allow interaction with temporary editing edges or edges from new rooms
            if (!edge.roomId.startsWith('editing-') && !newRoomsInEdit.includes(edge.roomId)) {
              return false;
            }
          } else {
            // No temporary editing rooms - only allow interaction with template edges or edges from new rooms
            if (!template.roomIds.includes(edge.roomId) && !newRoomsInEdit.includes(edge.roomId)) {
              return false;
            }
          }
        }
      } else if (creationMode === 'all-instances-are-templates') {
        // In normal "all-instances-are-templates" mode, ignore original template edges
        const isTemplateEdge = componentTemplates.some(t => t.roomIds.includes(edge.roomId));
        if (isTemplateEdge) {
          return false;
        }
      }
      
      const distanceToLine = Math.abs(
        (edge.y2 - edge.y1) * x - (edge.x2 - edge.x1) * y + 
        edge.x2 * edge.y1 - edge.y2 * edge.x1
      ) / Math.sqrt(
        Math.pow(edge.y2 - edge.y1, 2) + Math.pow(edge.x2 - edge.x1, 2)
      );
      return distanceToLine < tolerance;
    });
  }, [edges, creationMode, isEditingTemplate, editingTemplateId, componentTemplates, rooms, newRoomsInEdit]);

  const getInstanceAt = useCallback((x: number, y: number): ComponentInstance | undefined => {
    for (const instance of componentInstances) {
      const template = componentTemplates.find(t => t.id === instance.templateId);
      if (template) {
        const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
        if (templateRooms.length > 0) {
          // Use template origin as reference point
          const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
          const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
          
          // Calculate actual bounding box when rendered at instance position
          const instanceRoomPositions = templateRooms.map(r => ({
            x1: instance.x + (r.x - originX),
            y1: instance.y + (r.y - originY),
            x2: instance.x + (r.x - originX) + r.width,
            y2: instance.y + (r.y - originY) + r.height,
          }));
          
          const instanceMinX = Math.min(...instanceRoomPositions.map(p => p.x1));
          const instanceMinY = Math.min(...instanceRoomPositions.map(p => p.y1));
          const instanceMaxX = Math.max(...instanceRoomPositions.map(p => p.x2));
          const instanceMaxY = Math.max(...instanceRoomPositions.map(p => p.y2));
          
          if (x >= instanceMinX && x <= instanceMaxX && y >= instanceMinY && y <= instanceMaxY) {
            return instance;
          }
        }
      }
    }
    return undefined;
  }, [componentInstances, componentTemplates, rooms]);

  const getTemplateAt = useCallback((x: number, y: number): ComponentTemplate | undefined => {
    // In "template-is-first-instance" mode, check if clicking on a template
    if (creationMode !== 'template-is-first-instance') {
      return undefined;
    }
    
    // Don't allow template selection during editing
    if (isEditingTemplate) {
      return undefined;
    }
    
    for (const template of componentTemplates) {
      const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
      if (templateRooms.length > 0) {
        // Check if the point is within any of the template's rooms
        for (const room of templateRooms) {
          if (CanvasUtils.isPointInRoom({ x, y }, room)) {
            return template;
          }
        }
      }
    }
    return undefined;
  }, [componentTemplates, rooms, creationMode, isEditingTemplate]);

  const moveTemplate = useCallback((templateId: string, deltaX: number, deltaY: number) => {
    const template = componentTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
    if (templateRooms.length === 0) return;
    
    // Move all rooms in the template
    const updatedRooms = rooms.map(room => {
      if (template.roomIds.includes(room.id)) {
        return {
          ...room,
          x: room.x + deltaX,
          y: room.y + deltaY,
        };
      }
      return room;
    });
    
    setRooms(updatedRooms);
    
    // Also move the origin point to maintain relative positioning of instances
    if (template.originX !== undefined && template.originY !== undefined) {
      setComponentTemplates(prev => prev.map(t => 
        t.id === templateId 
          ? { ...t, originX: t.originX! + deltaX, originY: t.originY! + deltaY }
          : t
      ));
    }
    
    // Regenerate edges for all rooms (not just template rooms, to handle interactions)
    // Filter to only visible rooms for edge generation
    const visibleRooms = updatedRooms.filter(r => isRoomVisible(r, activeOptionState));
    
    const allEdges: Edge[] = [];
    for (const room of visibleRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, visibleRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
  }, [componentTemplates, rooms, activeOptionState]);

  const exportData = useCallback(() => {
    const data = {
      rooms,
      edges,
      mode,
      colorPriority,
      conflictMatrix,
      fileName,
      componentTemplates,
      componentInstances,
      links,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rooms, edges, mode, colorPriority, conflictMatrix, fileName, componentTemplates, componentInstances, links]);

  const importData = useCallback((data: any) => {
    try {
      if (data.rooms) setRooms(data.rooms);
      if (data.edges) setEdges(data.edges);
      if (data.mode) setMode(data.mode);
      if (data.colorPriority) setColorPriority(data.colorPriority);
      if (data.conflictMatrix) setConflictMatrix(data.conflictMatrix);
      if (data.fileName) setFileName(data.fileName);
      if (data.componentTemplates) setComponentTemplates(data.componentTemplates);
      if (data.componentInstances) setComponentInstances(data.componentInstances);
      if (data.links) setLinks(data.links);
      
      if (data.rooms && data.rooms.length > 0) {
        const maxId = Math.max(...data.rooms.map((r: Room) => 
          parseInt(r.id.replace('room-', '')) || 0
        ));
        nextRoomIdRef.current = maxId + 1;
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Invalid data format');
    }
  }, []);

  const toggleCornerPriority = useCallback((x: number, y: number) => {
    const cornerKey = `x${x}_y${y}`;
    setCornerPriorities(prev => {
      const current = prev[cornerKey];
      if (current === 'horizontal') {
        return { ...prev, [cornerKey]: 'vertical' };
      } else if (current === 'vertical') {
        return { ...prev, [cornerKey]: 'horizontal' };
      } else {
        return { ...prev, [cornerKey]: 'vertical' };
      }
    });
  }, []);

  const startOriginSelection = useCallback((name: string, roomIds: string[]) => {
    // Automatically calculate origin at bottom-left corner (AABB)
    const bounds = roomIds.reduce((acc, roomId) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return acc;
      return {
        minX: Math.min(acc.minX, room.x),
        minY: Math.min(acc.minY, room.y),
        maxY: Math.max(acc.maxY, room.y + room.height),
      };
    }, { minX: Infinity, minY: Infinity, maxY: -Infinity });
    
    if (bounds.minX !== Infinity) {
      // Place origin at bottom-left corner (minX, maxY)
      const originX = bounds.minX;
      const originY = bounds.maxY;
      
      // Create template immediately with calculated origin
      const templateId = `template-${nextTemplateIdRef.current++}`;
      const newTemplate: ComponentTemplate = {
        id: templateId,
        name,
        roomIds,
        originX,
        originY,
      };
      setComponentTemplates(prev => [...prev, newTemplate]);
      
      // Only create an instance automatically in "all-instances-are-templates" mode
      if (creationMode === 'all-instances-are-templates') {
        const instanceId = `instance-${nextInstanceIdRef.current++}`;
        const newInstance: ComponentInstance = {
          id: instanceId,
          templateId,
          x: bounds.minX,
          y: bounds.minY,
        };
        setComponentInstances(prev => [...prev, newInstance]);
        
        // Clear room selection after creating template/instance
        setSelectedRoomIds([]);
      }
    }
  }, [rooms, creationMode]);

  const selectOrigin = useCallback((x: number, y: number) => {
    // This function is kept for backwards compatibility but is no longer used
    // in the main template creation workflow (origin is now auto-calculated)
    setTemplateOriginX(x);
    setTemplateOriginY(y);
  }, []);

  const cancelOriginSelection = useCallback(() => {
    setIsSelectingOrigin(false);
    setPendingTemplateName('');
    setPendingTemplateRoomIds([]);
    setTemplateOriginX(undefined);
    setTemplateOriginY(undefined);
  }, []);

  const setTemplateOrigin = useCallback((x: number, y: number) => {
    if (isEditingTemplate && editingTemplateId) {
      // Update existing template's origin
      setComponentTemplates(prev => prev.map(t => 
        t.id === editingTemplateId ? { ...t, originX: x, originY: y } : t
      ));
      setTemplateOriginX(x);
      setTemplateOriginY(y);
    }
  }, [isEditingTemplate, editingTemplateId]);

  const createTemplate = useCallback((name: string, roomIds: string[]) => {
    // Automatically calculate origin at bottom-left corner (AABB)
    const bounds = roomIds.reduce((acc, roomId) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return acc;
      return {
        minX: Math.min(acc.minX, room.x),
        minY: Math.min(acc.minY, room.y),
        maxY: Math.max(acc.maxY, room.y + room.height),
      };
    }, { minX: Infinity, minY: Infinity, maxY: -Infinity });
    
    if (bounds.minX === Infinity) return;
    
    // Place origin at bottom-left corner (minX, maxY)
    const originX = bounds.minX;
    const originY = bounds.maxY;

    const templateId = `template-${nextTemplateIdRef.current++}`;
    const newTemplate: ComponentTemplate = {
      id: templateId,
      name,
      roomIds,
      originX,
      originY,
    };
    setComponentTemplates(prev => [...prev, newTemplate]);
    
    // Only create an instance automatically in "all-instances-are-templates" mode
    if (creationMode === 'all-instances-are-templates') {
      const instanceId = `instance-${nextInstanceIdRef.current++}`;
      const newInstance: ComponentInstance = {
        id: instanceId,
        templateId,
        x: bounds.minX,
        y: bounds.minY,
      };
      setComponentInstances(prev => [...prev, newInstance]);
      
      // Clear room selection after creating template/instance
      setSelectedRoomIds([]);
    }
  }, [rooms, creationMode]);

  const deleteTemplate = useCallback((templateId: string) => {
    setComponentTemplates(prev => prev.filter(t => t.id !== templateId));
    setComponentInstances(prev => prev.filter(i => i.templateId !== templateId));
  }, []);

  const updateTemplate = useCallback((templateId: string, updates: Partial<ComponentTemplate>) => {
    setComponentTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, ...updates } : t
    ));
  }, []);
  
  const updateTemplateOrigin = useCallback((templateId: string, x: number, y: number) => {
    updateTemplate(templateId, { originX: x, originY: y });
  }, [updateTemplate]);

  const placeInstance = useCallback((templateId: string, x: number, y: number) => {
    const template = componentTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
    if (templateRooms.length === 0) return;
    
    // No collision detection - place instance freely
    const instanceId = `instance-${nextInstanceIdRef.current++}`;
    const newInstance: ComponentInstance = {
      id: instanceId,
      templateId,
      x,
      y,
    };
    setComponentInstances(prev => [...prev, newInstance]);
  }, [componentTemplates, componentInstances, rooms, creationMode]);

  const moveInstance = useCallback((instanceId: string, x: number, y: number) => {
    const instance = componentInstances.find(i => i.id === instanceId);
    if (!instance) return;
    
    const template = componentTemplates.find(t => t.id === instance.templateId);
    if (!template) return;
    
    const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
    if (templateRooms.length === 0) return;
    
    const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
    const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
    
    // Constrain to grid (no negative coordinates)
    const constrainedX = Math.max(0, x);
    const constrainedY = Math.max(0, y);
    
    // Create virtual rooms for the instance at the new position
    const movedInstanceRooms: Room[] = templateRooms.map(room => ({
      ...room,
      id: `moved-${instance.id}-${room.id}`,
      x: constrainedX + (room.x - originX),
      y: constrainedY + (room.y - originY),
    }));
    
    // Create virtual rooms for all OTHER instances
    const otherInstanceRooms: Room[] = [];
    componentInstances.forEach(otherInstance => {
      if (otherInstance.id !== instanceId) {
        const otherTemplate = componentTemplates.find(t => t.id === otherInstance.templateId);
        if (otherTemplate) {
          const otherTemplateRooms = rooms.filter(r => otherTemplate.roomIds.includes(r.id));
          if (otherTemplateRooms.length > 0) {
            const otherOriginX = otherTemplate.originX ?? Math.min(...otherTemplateRooms.map(r => r.x));
            const otherOriginY = otherTemplate.originY ?? Math.min(...otherTemplateRooms.map(r => r.y));
            
            otherTemplateRooms.forEach(room => {
              otherInstanceRooms.push({
                ...room,
                id: `virtual-${otherInstance.id}-${room.id}`,
                x: otherInstance.x + (room.x - otherOriginX),
                y: otherInstance.y + (room.y - otherOriginY),
              });
            });
          }
        }
      }
    });
    
    // In "template-is-first-instance" mode, also check against template rooms
    const templateRoomsToCheck: Room[] = [];
    if (creationMode === 'template-is-first-instance') {
      componentTemplates.forEach(t => {
        const tRooms = rooms.filter(r => t.roomIds.includes(r.id));
        templateRoomsToCheck.push(...tRooms);
      });
    }
    
    // Combine all rooms to check against
    const allRoomsToCheck = [...otherInstanceRooms, ...templateRoomsToCheck];
    
    // Validate each room of the moved instance
    let isValid = true;
    for (const movedRoom of movedInstanceRooms) {
      if (!RoomValidation.isValidRoomPlacement(movedRoom, allRoomsToCheck)) {
        isValid = false;
        break;
      }
    }
    
    // Only move if valid
    if (isValid) {
      setComponentInstances(prev => prev.map(inst => {
        if (inst.id === instanceId) {
          return { ...inst, x: constrainedX, y: constrainedY };
        }
        return inst;
      }));
    }
  }, [componentInstances, componentTemplates, rooms, creationMode]);

  const deleteInstance = useCallback((instanceId: string) => {
    setComponentInstances(prev => prev.filter(i => i.id !== instanceId));
  }, []);

  const duplicateInstance = useCallback((instanceId: string) => {
    const instance = componentInstances.find(i => i.id === instanceId);
    if (!instance) return;
    
    const template = componentTemplates.find(t => t.id === instance.templateId);
    if (!template) return;
    
    const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
    if (templateRooms.length === 0) return;
    
    const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
    const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
    
    // No collision detection - place at offset position (5 grid units away)
    const targetX = instance.x + 5;
    const targetY = instance.y + 5;
    
    const newInstanceId = `instance-${nextInstanceIdRef.current++}`;
    const newInstance: ComponentInstance = {
      id: newInstanceId,
      templateId: instance.templateId,
      x: targetX,
      y: targetY,
    };
    setComponentInstances(prev => [...prev, newInstance]);
    setSelectedInstanceId(newInstanceId);
  }, [componentInstances, componentTemplates, rooms, creationMode]);

  const addLink = useCallback((linkedFileId: string, linkedFileName: string) => {
    const linkId = `link-${nextLinkIdRef.current++}`;
    const newLink: Link = {
      id: linkId,
      linkedFileId,
      linkedFileName,
      importedTemplateIds: [],
      hasUpdates: false,
    };
    setLinks(prev => [...prev, newLink]);
  }, []);

  const removeLink = useCallback((linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
  }, []);

  const importTemplatesFromLink = useCallback((linkId: string, templateIds: string[]) => {
    setLinks(prev => prev.map(link => 
      link.id === linkId 
        ? { ...link, importedTemplateIds: Array.from(new Set([...link.importedTemplateIds, ...templateIds])) }
        : link
    ));
  }, []);

  const updateLinkStatus = useCallback((linkId: string, hasUpdates: boolean) => {
    setLinks(prev => prev.map(link => 
      link.id === linkId ? { ...link, hasUpdates } : link
    ));
  }, []);

  const enterTemplateEditMode = useCallback((templateId: string, instanceId?: string) => {
    // Save current state for potential discard
    setPreEditState({
      rooms: [...rooms],
      edges: [...edges],
      templates: [...componentTemplates],
    });
    
    const template = componentTemplates.find(t => t.id === templateId);
    if (template) {
      // Set the template origin for editing/display
      // Handle legacy templates that don't have origin points
      if (template.originX !== undefined && template.originY !== undefined) {
        // If editing through an instance, translate the origin to the instance position
        if (instanceId) {
          const instance = componentInstances.find(i => i.id === instanceId);
          if (instance) {
            setTemplateOriginX(instance.x);
            setTemplateOriginY(instance.y);
          } else {
            setTemplateOriginX(template.originX);
            setTemplateOriginY(template.originY);
          }
        } else {
          setTemplateOriginX(template.originX);
          setTemplateOriginY(template.originY);
        }
      } else {
        // Calculate default origin (center of template bounds) for legacy templates
        const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
        if (templateRooms.length > 0) {
          const bounds = templateRooms.reduce((acc, room) => ({
            minX: Math.min(acc.minX, room.x),
            minY: Math.min(acc.minY, room.y),
            maxX: Math.max(acc.maxX, room.x + room.width),
            maxY: Math.max(acc.maxY, room.y + room.height),
          }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
          
          const centerX = Math.round((bounds.minX + bounds.maxX) / 2);
          const centerY = Math.round((bounds.minY + bounds.maxY) / 2);
          
          // If editing through an instance, translate the center to instance position
          if (instanceId) {
            const instance = componentInstances.find(i => i.id === instanceId);
            if (instance) {
              const originX = bounds.minX;
              const originY = bounds.minY;
              setTemplateOriginX(instance.x);
              setTemplateOriginY(instance.y);
            } else {
              setTemplateOriginX(centerX);
              setTemplateOriginY(centerY);
            }
          } else {
            setTemplateOriginX(centerX);
            setTemplateOriginY(centerY);
          }
          
          // Update the template with the calculated origin
          setComponentTemplates(prev => prev.map(t => 
            t.id === templateId ? { ...t, originX: centerX, originY: centerY } : t
          ));
        }
      }
    }
    
    if (instanceId) {
      // Editing through an instance - create temporary rooms at instance position
      const instance = componentInstances.find(i => i.id === instanceId);
      
      if (instance && template) {
        const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
        
        if (templateRooms.length > 0) {
          // Calculate the offset from template origin to instance position
          const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
          const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
          
          // Create temporary editing rooms at the instance position (not template position)
          const editingRooms = templateRooms.map(room => ({
            ...room,
            id: `editing-${room.id}`, // Temporary ID to avoid conflicts
            // Translate from template position to instance position
            x: instance.x + (room.x - originX),
            y: instance.y + (room.y - originY),
          }));
          
          // Add temporary rooms to the rooms array
          setRooms(prev => [...prev, ...editingRooms]);
          
          // Generate edges for the temporary rooms
          const allTempEdges: Edge[] = [];
          for (const room of editingRooms) {
            const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, editingRooms);
            allTempEdges.push(...roomEdges);
          }
          setEdges(prev => [...prev, ...allTempEdges]);
        }
      }
      
      setEditingInstanceId(instanceId);
    }
    
    setIsEditingTemplate(true);
    setEditingTemplateId(templateId);
  }, [rooms, edges, componentTemplates, componentInstances]);

  const exitTemplateEditMode = useCallback(() => {
    // Clean up temporary editing rooms and edges
    setRooms(prev => prev.filter(room => !room.id.startsWith('editing-')));
    setEdges(prev => prev.filter(edge => !edge.roomId.startsWith('editing-')));
    
    setIsEditingTemplate(false);
    setEditingTemplateId(undefined);
    setEditingInstanceId(undefined);
    setTemplateOriginX(undefined);
    setTemplateOriginY(undefined);
    setPreEditState(null);
    setNewRoomsInEdit([]); // Clear new rooms tracking
  }, []);

  const saveTemplateEdits = useCallback((): { hasOverlaps: boolean; overlappingInstances: string[] } => {
    if (!editingTemplateId) return { hasOverlaps: false, overlappingInstances: [] };
    
    let finalRooms = rooms;
    let updatedTemplate = componentTemplates.find(t => t.id === editingTemplateId);
    
    if (!updatedTemplate) return { hasOverlaps: false, overlappingInstances: [] };
    
    // Add any new rooms created during editing to the template
    if (newRoomsInEdit.length > 0) {
      updatedTemplate = {
        ...updatedTemplate,
        roomIds: [...updatedTemplate.roomIds, ...newRoomsInEdit],
      };
      setComponentTemplates(prev => prev.map(t => 
        t.id === editingTemplateId ? updatedTemplate! : t
      ));
    }
    
    if (editingInstanceId && preEditState) {
      // Editing through an instance - need to save changes back to template
      const instance = componentInstances.find(i => i.id === editingInstanceId);
      const template = updatedTemplate;
      
      if (instance && template) {
        // Get the temporary editing rooms and original template rooms
        const editingRooms = rooms.filter(r => r.id.startsWith('editing-'));
        const originalTemplateRooms = preEditState.rooms.filter(r => template.roomIds.includes(r.id));
        
        if (editingRooms.length > 0) {
          // Calculate the template origin
          const originX = template.originX ?? Math.min(...originalTemplateRooms.map(r => r.x));
          const originY = template.originY ?? Math.min(...originalTemplateRooms.map(r => r.y));
          
          // Translate editing rooms from instance position back to template position
          let updatedRooms = rooms.filter(r => !r.id.startsWith('editing-')).map(room => {
            if (!template.roomIds.includes(room.id)) {
              return room; // Not a template room, leave unchanged
            }
            
            const matchingEditingRoom = editingRooms.find(er => er.id === `editing-${room.id}`);
            if (matchingEditingRoom) {
              // Copy the editing room's changes and translate back to template position
              return {
                ...matchingEditingRoom, // Copy all properties (width, height, color, etc.)
                id: room.id, // Restore original ID
                // Translate from instance position back to template position
                x: originX + (matchingEditingRoom.x - instance.x),
                y: originY + (matchingEditingRoom.y - instance.y),
              };
            }
            
            return room;
          });
          
          // Also translate any new rooms created during editing back to template position
          if (newRoomsInEdit.length > 0) {
            updatedRooms = updatedRooms.map(room => {
              if (newRoomsInEdit.includes(room.id)) {
                return {
                  ...room,
                  x: originX + (room.x - instance.x),
                  y: originY + (room.y - instance.y),
                };
              }
              return room;
            });
          }
          
          finalRooms = updatedRooms;
          
          // Update rooms state
          setRooms(updatedRooms);
          
          // Regenerate edges for the updated rooms
          // Filter to only visible rooms for edge generation
          const visibleRooms = updatedRooms.filter(r => isRoomVisible(r, activeOptionState));
          
          const allEdges: Edge[] = [];
          for (const room of visibleRooms) {
            const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, visibleRooms);
            allEdges.push(...roomEdges);
          }
          setEdges(allEdges);
        }
      }
    }
    
    // Check for overlaps between instances after template changes
    const template = componentTemplates.find(t => t.id === editingTemplateId);
    const overlappingInstances: string[] = [];
    
    if (template) {
      const templateInstances = componentInstances.filter(i => i.templateId === editingTemplateId);
      const templateRooms = finalRooms.filter(r => template.roomIds.includes(r.id));
      
      if (templateRooms.length > 0 && templateInstances.length > 0) {
        const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
        const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
        
        // Check each instance against all other instances
        for (let i = 0; i < templateInstances.length; i++) {
          const instance1 = templateInstances[i];
          
          // Create virtual rooms for instance1
          const instance1Rooms = templateRooms.map(r => ({
            ...r,
            id: `virtual-${instance1.id}-${r.id}`,
            x: instance1.x + (r.x - originX),
            y: instance1.y + (r.y - originY),
          }));
          
          // Check against all other instances
          for (let j = i + 1; j < templateInstances.length; j++) {
            const instance2 = templateInstances[j];
            
            // Create virtual rooms for instance2
            const instance2Rooms = templateRooms.map(r => ({
              ...r,
              id: `virtual-${instance2.id}-${r.id}`,
              x: instance2.x + (r.x - originX),
              y: instance2.y + (r.y - originY),
            }));
            
            // Check if any room from instance1 overlaps with any room from instance2
            let hasOverlap = false;
            for (const room1 of instance1Rooms) {
              for (const room2 of instance2Rooms) {
                if (!RoomValidation.isValidRoomPlacement(room1, [room2])) {
                  hasOverlap = true;
                  break;
                }
              }
              if (hasOverlap) break;
            }
            
            if (hasOverlap) {
              if (!overlappingInstances.includes(instance1.id)) {
                overlappingInstances.push(instance1.id);
              }
              if (!overlappingInstances.includes(instance2.id)) {
                overlappingInstances.push(instance2.id);
              }
            }
          }
        }
      }
    }
    
    // Exit edit mode and clean up
    exitTemplateEditMode();
    
    return {
      hasOverlaps: overlappingInstances.length > 0,
      overlappingInstances,
    };
  }, [editingTemplateId, editingInstanceId, componentInstances, componentTemplates, rooms, preEditState, exitTemplateEditMode, newRoomsInEdit]);

  const discardTemplateEdits = useCallback(() => {
    if (!preEditState) return;
    
    // Restore the previous state (this will remove any new rooms created during editing)
    setRooms(preEditState.rooms);
    setEdges(preEditState.edges);
    setComponentTemplates(preEditState.templates);
    
    exitTemplateEditMode();
  }, [preEditState, exitTemplateEditMode]);

  // Option management functions
  const createOption = useCallback((name: string) => {
    const optionId = `option-${nextOptionIdRef.current++}`;
    const value1Id = `value-${nextOptionValueIdRef.current++}`;
    const value2Id = `value-${nextOptionValueIdRef.current++}`;
    
    const newOption: Option = {
      id: optionId,
      name,
      values: [
        { id: value1Id, name: 'Option 1' },
        { id: value2Id, name: 'Option 2' },
      ],
    };
    
    setOptions(prev => [...prev, newOption]);
    // Set the first value as active by default
    setActiveOptionState(prev => ({ ...prev, [optionId]: value1Id }));
  }, []);

  const updateOption = useCallback((optionId: string, name: string) => {
    setOptions(prev => prev.map(opt => 
      opt.id === optionId ? { ...opt, name } : opt
    ));
  }, []);

  const deleteOption = useCallback((optionId: string) => {
    setOptions(prev => prev.filter(opt => opt.id !== optionId));
    setActiveOptionState(prev => {
      const newState = { ...prev };
      delete newState[optionId];
      return newState;
    });
    if (selectedOptionId === optionId) {
      setSelectedOptionId(undefined);
    }
  }, [selectedOptionId]);

  const addOptionValue = useCallback((optionId: string, name: string) => {
    const valueId = `value-${nextOptionValueIdRef.current++}`;
    setOptions(prev => prev.map(opt => {
      if (opt.id === optionId) {
        return {
          ...opt,
          values: [...opt.values, { id: valueId, name }],
        };
      }
      return opt;
    }));
  }, []);

  const updateOptionValue = useCallback((optionId: string, valueId: string, name: string) => {
    setOptions(prev => prev.map(opt => {
      if (opt.id === optionId) {
        return {
          ...opt,
          values: opt.values.map(val => 
            val.id === valueId ? { ...val, name } : val
          ),
        };
      }
      return opt;
    }));
  }, []);

  const deleteOptionValue = useCallback((optionId: string, valueId: string) => {
    setOptions(prev => prev.map(opt => {
      if (opt.id === optionId) {
        const newValues = opt.values.filter(val => val.id !== valueId);
        // Ensure at least 2 values remain
        if (newValues.length >= 2) {
          return { ...opt, values: newValues };
        }
      }
      return opt;
    }));
    
    // If the deleted value was active, switch to first remaining value
    if (activeOptionState[optionId] === valueId) {
      const option = options.find(opt => opt.id === optionId);
      if (option && option.values.length > 1) {
        const newFirstValue = option.values.find(val => val.id !== valueId);
        if (newFirstValue) {
          setActiveOptionState(prev => ({ ...prev, [optionId]: newFirstValue.id }));
        }
      }
    }
  }, [options, activeOptionState]);

  const setActiveOptionValue = useCallback((optionId: string, valueId: string) => {
    const newActiveOptionState = { ...activeOptionState, [optionId]: valueId };
    setActiveOptionState(newActiveOptionState);
    
    // Regenerate edges based on new visibility state
    const existingEdgeProps = new Map<string, { colorOverride?: RoomColor; name?: string }>();
    edges.forEach(edge => {
      const key = `${edge.roomId}-${edge.side}`;
      if (edge.colorOverride || edge.name) {
        existingEdgeProps.set(key, {
          colorOverride: edge.colorOverride,
          name: edge.name
        });
      }
    });
    
    // Filter to only visible rooms for edge generation
    const visibleRooms = rooms.filter(r => isRoomVisible(r, newActiveOptionState));
    
    const allEdges: Edge[] = [];
    for (const room of visibleRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, visibleRooms);
      roomEdges.forEach(edge => {
        const key = `${edge.roomId}-${edge.side}`;
        const preserved = existingEdgeProps.get(key);
        if (preserved) {
          if (preserved.colorOverride) edge.colorOverride = preserved.colorOverride;
          if (preserved.name) edge.name = preserved.name;
        }
      });
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
  }, [activeOptionState, rooms, edges]);

  // Option Component management functions
  const createOptionComponent = useCallback((name: string) => {
    const optionComponentId = `optionComponent-${nextOptionComponentIdRef.current++}`;
    const newOptionComponent: OptionComponent = {
      id: optionComponentId,
      name,
      optionIds: [],
    };
    setOptionComponents(prev => [...prev, newOptionComponent]);
  }, []);

  const updateOptionComponent = useCallback((optionComponentId: string, name: string) => {
    setOptionComponents(prev => prev.map(oc => 
      oc.id === optionComponentId ? { ...oc, name } : oc
    ));
  }, []);

  const deleteOptionComponent = useCallback((optionComponentId: string) => {
    setOptionComponents(prev => prev.filter(oc => oc.id !== optionComponentId));
    if (selectedOptionComponentId === optionComponentId) {
      setSelectedOptionComponentId(undefined);
    }
  }, [selectedOptionComponentId]);

  const addOptionToComponent = useCallback((optionComponentId: string, optionId: string) => {
    setOptionComponents(prev => prev.map(oc => {
      if (oc.id === optionComponentId && !oc.optionIds.includes(optionId)) {
        return { ...oc, optionIds: [...oc.optionIds, optionId] };
      }
      return oc;
    }));
  }, []);

  const removeOptionFromComponent = useCallback((optionComponentId: string, optionId: string) => {
    setOptionComponents(prev => prev.map(oc => {
      if (oc.id === optionComponentId) {
        return { ...oc, optionIds: oc.optionIds.filter(id => id !== optionId) };
      }
      return oc;
    }));
  }, []);

  // Helper to get special options that need instance-specific values
  const getSpecialOptions = useCallback(() => {
    const specialOptionsMap = new Map<string, { option: Option; instances: ComponentInstance[] }>();
    
    // Find all special conditions in template rooms
    componentTemplates.forEach(template => {
      const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
      
      templateRooms.forEach(room => {
        if (room.conditions) {
          room.conditions.forEach(condition => {
            if (condition.isSpecial) {
              const option = options.find(o => o.id === condition.optionId);
              if (option) {
                // Find all instances of this template
                const instances = componentInstances.filter(inst => inst.templateId === template.id);
                
                if (!specialOptionsMap.has(option.id)) {
                  specialOptionsMap.set(option.id, { option, instances: [] });
                }
                
                const entry = specialOptionsMap.get(option.id)!;
                // Add instances that aren't already in the list
                instances.forEach(inst => {
                  if (!entry.instances.find(i => i.id === inst.id)) {
                    entry.instances.push(inst);
                  }
                });
              }
            }
          });
        }
      });
    });
    
    return Array.from(specialOptionsMap.values());
  }, [rooms, componentTemplates, componentInstances, options]);

  return {
    rooms,
    edges,
    mode,
    colorPriority,
    conflictMatrix,
    cornerPriorities,
    selectedTool,
    selectedColor,
    selectedRoomId,
    selectedEdgeId,
    selectedRoomIds,
    selectedInstanceId,
    selectedTemplateId,
    showGrid,
    fileName,
    componentTemplates,
    componentInstances,
    links,
    options,
    activeOptionState,
    selectedOptionId,
    creationMode,
    optionMode,
    isEditingTemplate,
    editingTemplateId,
    editingInstanceId,
    isSelectingOrigin,
    templateOriginX,
    templateOriginY,
    newRoomsInEdit,
    addRoom,
    deleteRoom,
    moveRoom,
    updateRoom,
    updateEdge,
    setMode,
    setColorPriority,
    setConflictMatrix,
    setSelectedTool,
    setSelectedColor,
    setSelectedRoomId,
    setSelectedEdgeId,
    setSelectedRoomIds,
    setSelectedInstanceId,
    setSelectedTemplateId,
    setShowGrid,
    setFileName,
    setCreationMode,
    setOptionMode,
    toggleCornerPriority,
    exportData,
    importData,
    getEdgeColor,
    getRoomAt,
    getEdgeAt,
    getInstanceAt,
    getTemplateAt,
    createTemplate,
    startOriginSelection,
    selectOrigin,
    cancelOriginSelection,
    setTemplateOrigin,
    updateTemplateOrigin,
    deleteTemplate,
    updateTemplate,
    placeInstance,
    moveInstance,
    moveTemplate,
    deleteInstance,
    duplicateInstance,
    addLink,
    removeLink,
    importTemplatesFromLink,
    updateLinkStatus,
    enterTemplateEditMode,
    exitTemplateEditMode,
    saveTemplateEdits,
    discardTemplateEdits,
    createOption,
    updateOption,
    deleteOption,
    addOptionValue,
    updateOptionValue,
    deleteOptionValue,
    setActiveOptionValue,
    setSelectedOptionId,
    optionComponents,
    selectedOptionComponentId,
    createOptionComponent,
    updateOptionComponent,
    deleteOptionComponent,
    addOptionToComponent,
    removeOptionFromComponent,
    setSelectedOptionComponentId,
    getSpecialOptions,
  };
}
