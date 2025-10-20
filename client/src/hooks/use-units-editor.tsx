import { useState, useCallback, useRef } from 'react';
import { Room, Edge, ConflictMatrixEntry, RoomColor, EdgeFightingMode, CornerPriority, ComponentTemplate, ComponentInstance, Link, Option, OptionValue } from '@shared/schema';
import { ROOM_COLORS } from '@/types/room';
import { CanvasUtils } from '@/lib/canvas-utils';
import { EdgeFightingResolver } from '@/lib/edge-fighting';
import { RoomValidation } from '@/lib/room-validation';

export type CreationMode = 'template-is-first-instance' | 'all-instances-are-templates' | 'template-is-separate-file';

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
  showGrid: boolean;
  fileName: string;
  componentTemplates: ComponentTemplate[];
  componentInstances: ComponentInstance[];
  links: Link[];
  options: Option[];
  activeOptionState: Record<string, string>;
  selectedOptionId: string | undefined;
  creationMode: CreationMode;
  isEditingTemplate: boolean;
  editingTemplateId: string | undefined;
  editingInstanceId: string | undefined;
  isSelectingOrigin: boolean;
  templateOriginX: number | undefined;
  templateOriginY: number | undefined;
  
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
  setShowGrid: (show: boolean) => void;
  setFileName: (name: string) => void;
  setCreationMode: (mode: CreationMode) => void;
  toggleCornerPriority: (x: number, y: number) => void;
  exportData: () => void;
  importData: (data: any) => void;
  getEdgeColor: (edge: Edge) => string;
  getRoomAt: (x: number, y: number) => Room | undefined;
  getEdgeAt: (x: number, y: number) => Edge | undefined;
  getInstanceAt: (x: number, y: number) => ComponentInstance | undefined;
  
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
  const [showGrid, setShowGrid] = useState(true);
  const [cornerPriorities, setCornerPriorities] = useState<Record<string, CornerPriority>>({});
  const [fileName, setFileName] = useState('Untitled Project');
  const [componentTemplates, setComponentTemplates] = useState<ComponentTemplate[]>([]);
  const [componentInstances, setComponentInstances] = useState<ComponentInstance[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [activeOptionState, setActiveOptionState] = useState<Record<string, string>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>();
  const [creationMode, setCreationMode] = useState<CreationMode>('template-is-first-instance');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>();
  const [editingInstanceId, setEditingInstanceId] = useState<string | undefined>();
  const [preEditState, setPreEditState] = useState<{ rooms: Room[], edges: Edge[], templates: ComponentTemplate[] } | null>(null);
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

    if (!RoomValidation.isValidRoomPlacement(newRoom, rooms)) {
      const validPosition = RoomValidation.getNearestValidPosition(newRoom, x, y, rooms);
      newRoom.x = validPosition.x;
      newRoom.y = validPosition.y;
    }

    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms);
    
    const allEdges: Edge[] = [];
    for (const room of updatedRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
    
    updateColorPriorityForUsedColors(updatedRooms, allEdges);
  }, [selectedColor, rooms, updateColorPriorityForUsedColors]);

  const deleteRoom = useCallback((roomId: string) => {
    const updatedRooms = rooms.filter(room => room.id !== roomId);
    setRooms(updatedRooms);
    
    const allEdges: Edge[] = [];
    for (const room of updatedRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
    
    updateColorPriorityForUsedColors(updatedRooms, allEdges);
    
    if (selectedRoomId === roomId) {
      setSelectedRoomId(undefined);
    }
    
    setSelectedRoomIds(prev => prev.filter(id => id !== roomId));
  }, [selectedRoomId, rooms, updateColorPriorityForUsedColors]);

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
    
    const allEdges: Edge[] = [];
    for (const room of updatedRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
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
  }, [rooms, edges]);

  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    const updatedRooms = rooms.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    );
    setRooms(updatedRooms);
    
    if (updates.color !== undefined) {
      updateColorPriorityForUsedColors(updatedRooms, edges);
    }
    
    if (updates.width !== undefined || updates.height !== undefined || 
        updates.x !== undefined || updates.y !== undefined) {
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
      
      const allEdges: Edge[] = [];
      for (const room of updatedRooms) {
        const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
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
  }, [rooms, edges, updateColorPriorityForUsedColors]);

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
    return EdgeFightingResolver.resolveEdgeColor(
      edge, rooms, mode, colorPriority, conflictMatrix, edges
    );
  }, [rooms, edges, mode, colorPriority, conflictMatrix]);

  const getRoomAt = useCallback((x: number, y: number): Room | undefined => {
    return rooms.find(room => {
      // In template editing mode, only detect temporary editing rooms
      if (isEditingTemplate && editingTemplateId) {
        // Only allow interaction with temporary editing rooms
        if (!room.id.startsWith('editing-')) {
          return false;
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
  }, [rooms, creationMode, isEditingTemplate, editingTemplateId, componentTemplates]);

  const getEdgeAt = useCallback((x: number, y: number): Edge | undefined => {
    const tolerance = 0.5;
    return edges.find(edge => {
      // In template editing mode, only detect temporary editing edges
      if (isEditingTemplate && editingTemplateId) {
        // Only allow interaction with temporary editing edges
        if (!edge.roomId.startsWith('editing-')) {
          return false;
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
  }, [edges, creationMode, isEditingTemplate, editingTemplateId, componentTemplates]);

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
    
    const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
    const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
    
    // Create virtual rooms for the new instance being placed
    const newInstanceRooms: Room[] = templateRooms.map(room => ({
      ...room,
      id: `new-instance-${room.id}`,
      x: x + (room.x - originX),
      y: y + (room.y - originY),
    }));
    
    // Create virtual rooms for all existing instances
    const existingInstanceRooms: Room[] = [];
    componentInstances.forEach(instance => {
      const instanceTemplate = componentTemplates.find(t => t.id === instance.templateId);
      if (instanceTemplate) {
        const instanceTemplateRooms = rooms.filter(r => instanceTemplate.roomIds.includes(r.id));
        if (instanceTemplateRooms.length > 0) {
          const instanceOriginX = instanceTemplate.originX ?? Math.min(...instanceTemplateRooms.map(r => r.x));
          const instanceOriginY = instanceTemplate.originY ?? Math.min(...instanceTemplateRooms.map(r => r.y));
          
          instanceTemplateRooms.forEach(room => {
            existingInstanceRooms.push({
              ...room,
              id: `virtual-${instance.id}-${room.id}`,
              x: instance.x + (room.x - instanceOriginX),
              y: instance.y + (room.y - instanceOriginY),
            });
          });
        }
      }
    });
    
    // In "template-is-first-instance" mode, also check against template rooms
    const templateRoomsToCheck: Room[] = [];
    if (creationMode === 'template-is-first-instance') {
      // Get all template rooms that are visible (not part of instances)
      componentTemplates.forEach(t => {
        const tRooms = rooms.filter(r => t.roomIds.includes(r.id));
        templateRoomsToCheck.push(...tRooms);
      });
    }
    
    // Combine all rooms to check against
    const allRoomsToCheck = [...existingInstanceRooms, ...templateRoomsToCheck];
    
    // Validate each room of the new instance
    let isValid = true;
    for (const newRoom of newInstanceRooms) {
      if (!RoomValidation.isValidRoomPlacement(newRoom, allRoomsToCheck)) {
        isValid = false;
        break;
      }
    }
    
    // If valid, place the instance
    if (isValid) {
      const instanceId = `instance-${nextInstanceIdRef.current++}`;
      const newInstance: ComponentInstance = {
        id: instanceId,
        templateId,
        x,
        y,
      };
      setComponentInstances(prev => [...prev, newInstance]);
    }
    // If not valid, silently reject (don't place the instance)
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
    
    // Try to place at offset position (5 grid units away)
    const targetX = instance.x + 5;
    const targetY = instance.y + 5;
    
    // Create virtual rooms for the new instance
    const newInstanceRooms: Room[] = templateRooms.map(room => ({
      ...room,
      id: `duplicate-${room.id}`,
      x: targetX + (room.x - originX),
      y: targetY + (room.y - originY),
    }));
    
    // Create virtual rooms for all existing instances
    const existingInstanceRooms: Room[] = [];
    componentInstances.forEach(existingInstance => {
      const existingTemplate = componentTemplates.find(t => t.id === existingInstance.templateId);
      if (existingTemplate) {
        const existingTemplateRooms = rooms.filter(r => existingTemplate.roomIds.includes(r.id));
        if (existingTemplateRooms.length > 0) {
          const existingOriginX = existingTemplate.originX ?? Math.min(...existingTemplateRooms.map(r => r.x));
          const existingOriginY = existingTemplate.originY ?? Math.min(...existingTemplateRooms.map(r => r.y));
          
          existingTemplateRooms.forEach(room => {
            existingInstanceRooms.push({
              ...room,
              id: `virtual-${existingInstance.id}-${room.id}`,
              x: existingInstance.x + (room.x - existingOriginX),
              y: existingInstance.y + (room.y - existingOriginY),
            });
          });
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
    const allRoomsToCheck = [...existingInstanceRooms, ...templateRoomsToCheck];
    
    // Validate placement
    let isValid = true;
    for (const newRoom of newInstanceRooms) {
      if (!RoomValidation.isValidRoomPlacement(newRoom, allRoomsToCheck)) {
        isValid = false;
        break;
      }
    }
    
    // If valid, create the duplicate
    if (isValid) {
      const newInstanceId = `instance-${nextInstanceIdRef.current++}`;
      const newInstance: ComponentInstance = {
        id: newInstanceId,
        templateId: instance.templateId,
        x: targetX,
        y: targetY,
      };
      setComponentInstances(prev => [...prev, newInstance]);
      setSelectedInstanceId(newInstanceId);
    }
    // If not valid, silently reject the duplicate
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
        setTemplateOriginX(template.originX);
        setTemplateOriginY(template.originY);
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
          setTemplateOriginX(centerX);
          setTemplateOriginY(centerY);
          
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
          // Create temporary editing rooms at their current positions
          // Don't reposition them - let them stay where they are
          const editingRooms = templateRooms.map(room => ({
            ...room,
            id: `editing-${room.id}`, // Temporary ID to avoid conflicts
            // Keep original positions - no translation
            x: room.x,
            y: room.y,
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
  }, []);

  const saveTemplateEdits = useCallback(() => {
    if (!editingTemplateId) return;
    
    if (editingInstanceId && preEditState) {
      // Editing through an instance - need to save changes back to template
      const instance = componentInstances.find(i => i.id === editingInstanceId);
      const template = componentTemplates.find(t => t.id === editingTemplateId);
      
      if (instance && template) {
        // Get the temporary editing rooms and original template rooms
        const editingRooms = rooms.filter(r => r.id.startsWith('editing-'));
        const originalTemplateRooms = preEditState.rooms.filter(r => template.roomIds.includes(r.id));
        
        if (editingRooms.length > 0) {
          // Since editing rooms are at their original positions, directly copy changes back
          const updatedRooms = rooms.filter(r => !r.id.startsWith('editing-')).map(room => {
            if (!template.roomIds.includes(room.id)) {
              return room; // Not a template room, leave unchanged
            }
            
            const matchingEditingRoom = editingRooms.find(er => er.id === `editing-${room.id}`);
            if (matchingEditingRoom) {
              // Copy the editing room's changes back to the original template room
              return {
                ...matchingEditingRoom, // Copy all properties (width, height, color, etc.)
                id: room.id, // Restore original ID
              };
            }
            
            return room;
          });
          
          // Update rooms state
          setRooms(updatedRooms);
          
          // Regenerate edges for the updated rooms
          const allEdges: Edge[] = [];
          for (const room of updatedRooms) {
            const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
            allEdges.push(...roomEdges);
          }
          setEdges(allEdges);
        }
      }
    }
    
    // Exit edit mode and clean up
    exitTemplateEditMode();
  }, [editingTemplateId, editingInstanceId, componentInstances, componentTemplates, rooms, preEditState, exitTemplateEditMode]);

  const discardTemplateEdits = useCallback(() => {
    if (!preEditState) return;
    
    // Restore the previous state
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
    setActiveOptionState(prev => ({ ...prev, [optionId]: valueId }));
  }, []);

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
    showGrid,
    fileName,
    componentTemplates,
    componentInstances,
    links,
    options,
    activeOptionState,
    selectedOptionId,
    creationMode,
    isEditingTemplate,
    editingTemplateId,
    editingInstanceId,
    isSelectingOrigin,
    templateOriginX,
    templateOriginY,
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
    setShowGrid,
    setFileName,
    setCreationMode,
    toggleCornerPriority,
    exportData,
    importData,
    getEdgeColor,
    getRoomAt,
    getEdgeAt,
    getInstanceAt,
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
  };
}
