import { useState, useCallback, useRef } from 'react';
import { Room, Edge, ConflictMatrixEntry, RoomColor, EdgeFightingMode, CornerPriority, ComponentTemplate, ComponentInstance, Link } from '@shared/schema';
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
  creationMode: CreationMode;
  
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
  const [creationMode, setCreationMode] = useState<CreationMode>('template-is-first-instance');

  const nextRoomIdRef = useRef(1);
  const nextTemplateIdRef = useRef(1);
  const nextInstanceIdRef = useRef(1);
  const nextLinkIdRef = useRef(1);

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
    return rooms.find(room => CanvasUtils.isPointInRoom({ x, y }, room));
  }, [rooms]);

  const getEdgeAt = useCallback((x: number, y: number): Edge | undefined => {
    const tolerance = 0.5;
    return edges.find(edge => {
      const distanceToLine = Math.abs(
        (edge.y2 - edge.y1) * x - (edge.x2 - edge.x1) * y + 
        edge.x2 * edge.y1 - edge.y2 * edge.x1
      ) / Math.sqrt(
        Math.pow(edge.y2 - edge.y1, 2) + Math.pow(edge.x2 - edge.x1, 2)
      );
      return distanceToLine < tolerance;
    });
  }, [edges]);

  const getInstanceAt = useCallback((x: number, y: number): ComponentInstance | undefined => {
    for (const instance of componentInstances) {
      const template = componentTemplates.find(t => t.id === instance.templateId);
      if (template) {
        const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
        if (templateRooms.length > 0) {
          const minX = Math.min(...templateRooms.map(r => r.x));
          const minY = Math.min(...templateRooms.map(r => r.y));
          const maxX = Math.max(...templateRooms.map(r => r.x + r.width));
          const maxY = Math.max(...templateRooms.map(r => r.y + r.height));
          
          const instanceMinX = instance.x;
          const instanceMinY = instance.y;
          const instanceMaxX = instance.x + (maxX - minX);
          const instanceMaxY = instance.y + (maxY - minY);
          
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

  const createTemplate = useCallback((name: string, roomIds: string[]) => {
    const templateId = `template-${nextTemplateIdRef.current++}`;
    const newTemplate: ComponentTemplate = {
      id: templateId,
      name,
      roomIds,
    };
    setComponentTemplates(prev => [...prev, newTemplate]);
    
    const bounds = roomIds.reduce((acc, roomId) => {
      const room = rooms.find(r => r.id === roomId);
      if (!room) return acc;
      return {
        minX: Math.min(acc.minX, room.x),
        minY: Math.min(acc.minY, room.y),
      };
    }, { minX: Infinity, minY: Infinity });
    
    const instanceId = `instance-${nextInstanceIdRef.current++}`;
    const newInstance: ComponentInstance = {
      id: instanceId,
      templateId,
      x: bounds.minX,
      y: bounds.minY,
    };
    setComponentInstances(prev => [...prev, newInstance]);
  }, [rooms]);

  const deleteTemplate = useCallback((templateId: string) => {
    setComponentTemplates(prev => prev.filter(t => t.id !== templateId));
    setComponentInstances(prev => prev.filter(i => i.templateId !== templateId));
  }, []);

  const updateTemplate = useCallback((templateId: string, updates: Partial<ComponentTemplate>) => {
    setComponentTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, ...updates } : t
    ));
  }, []);

  const placeInstance = useCallback((templateId: string, x: number, y: number) => {
    const instanceId = `instance-${nextInstanceIdRef.current++}`;
    const newInstance: ComponentInstance = {
      id: instanceId,
      templateId,
      x,
      y,
    };
    setComponentInstances(prev => [...prev, newInstance]);
  }, []);

  const moveInstance = useCallback((instanceId: string, x: number, y: number) => {
    setComponentInstances(prev => prev.map(instance => {
      if (instance.id === instanceId) {
        // Constrain to grid (no negative coordinates)
        const constrainedX = Math.max(0, x);
        const constrainedY = Math.max(0, y);
        return { ...instance, x: constrainedX, y: constrainedY };
      }
      return instance;
    }));
  }, []);

  const deleteInstance = useCallback((instanceId: string) => {
    setComponentInstances(prev => prev.filter(i => i.id !== instanceId));
  }, []);

  const duplicateInstance = useCallback((instanceId: string) => {
    const instance = componentInstances.find(i => i.id === instanceId);
    if (!instance) return;
    
    const newInstanceId = `instance-${nextInstanceIdRef.current++}`;
    const newInstance: ComponentInstance = {
      id: newInstanceId,
      templateId: instance.templateId,
      x: instance.x + 5, // Offset by 5 grid units
      y: instance.y + 5,
    };
    setComponentInstances(prev => [...prev, newInstance]);
    setSelectedInstanceId(newInstanceId); // Select the new instance
  }, [componentInstances]);

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
    creationMode,
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
  };
}
