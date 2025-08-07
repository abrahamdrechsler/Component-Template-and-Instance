import { useState, useCallback, useRef, useEffect } from 'react';
import { Room, Edge, ConflictMatrixEntry, RoomColor, EdgeFightingMode } from '@shared/schema';
import { DEFAULT_COLOR_PRIORITY, ROOM_COLORS } from '@/types/room';
import { CanvasUtils } from '@/lib/canvas-utils';
import { EdgeFightingResolver } from '@/lib/edge-fighting';
import { RoomValidation } from '@/lib/room-validation';

export interface UseEdgeConflictReturn {
  // State
  rooms: Room[];
  edges: Edge[];
  mode: EdgeFightingMode;
  colorPriority: RoomColor[];
  conflictMatrix: ConflictMatrixEntry[];
  selectedTool: 'draw' | 'move' | 'delete';
  selectedColor: RoomColor;
  selectedRoomId: string | undefined;
  selectedEdgeId: string | undefined;
  showGrid: boolean;
  
  // Actions
  addRoom: (x: number, y: number, width: number, height: number) => void;
  deleteRoom: (roomId: string) => void;
  moveRoom: (roomId: string, x: number, y: number) => void;
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  setMode: (mode: EdgeFightingMode) => void;
  setColorPriority: (priority: RoomColor[]) => void;
  setConflictMatrix: (matrix: ConflictMatrixEntry[]) => void;
  setSelectedTool: (tool: 'draw' | 'move' | 'delete') => void;
  setSelectedColor: (color: RoomColor) => void;
  setSelectedRoomId: (roomId: string | undefined) => void;
  setSelectedEdgeId: (edgeId: string | undefined) => void;
  setShowGrid: (show: boolean) => void;
  exportData: () => void;
  importData: (data: any) => void;
  getEdgeColor: (edge: Edge) => string;
  getRoomAt: (x: number, y: number) => Room | undefined;
  getEdgeAt: (x: number, y: number) => Edge | undefined;
}

export function useEdgeConflict(): UseEdgeConflictReturn {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<EdgeFightingMode>('chronological');
  const [colorPriority, setColorPriority] = useState<RoomColor[]>([]);
  const [conflictMatrix, setConflictMatrix] = useState<ConflictMatrixEntry[]>([]);
  const [selectedTool, setSelectedTool] = useState<'draw' | 'move' | 'delete'>('draw');
  const [selectedColor, setSelectedColor] = useState<RoomColor>('skyBlue');
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>();
  const [showGrid, setShowGrid] = useState(true);

  const nextRoomIdRef = useRef(1);

  // Helper function to update color priority based on used colors
  const updateColorPriorityForUsedColors = useCallback((roomList: Room[]) => {
    const usedColorsSet = new Set(roomList.map(room => room.color));
    const usedColors = Array.from(usedColorsSet);
    
    // Keep existing priority order for colors that are still used
    const newPriority = colorPriority.filter(color => usedColorsSet.has(color));
    
    // Add any new colors to the bottom
    usedColors.forEach(color => {
      if (!newPriority.includes(color)) {
        newPriority.push(color);
      }
    });
    
    // Only update if the priority list changed
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

    // Validate room placement
    if (!RoomValidation.isValidRoomPlacement(newRoom, rooms)) {
      // Find nearest valid position
      const validPosition = RoomValidation.getNearestValidPosition(newRoom, x, y, rooms);
      newRoom.x = validPosition.x;
      newRoom.y = validPosition.y;
    }

    const updatedRooms = [...rooms, newRoom];
    setRooms(updatedRooms);
    
    // Update color priority based on used colors
    updateColorPriorityForUsedColors(updatedRooms);
    
    // Regenerate ALL edges with segmentation based on all rooms
    const allEdges: Edge[] = [];
    for (const room of updatedRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
  }, [selectedColor, rooms, updateColorPriorityForUsedColors]);

  const deleteRoom = useCallback((roomId: string) => {
    const updatedRooms = rooms.filter(room => room.id !== roomId);
    setRooms(updatedRooms);
    
    // Update color priority based on remaining used colors
    updateColorPriorityForUsedColors(updatedRooms);
    
    // Regenerate ALL edges with segmentation based on remaining rooms
    const allEdges: Edge[] = [];
    for (const room of updatedRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
    
    if (selectedRoomId === roomId) {
      setSelectedRoomId(undefined);
    }
  }, [selectedRoomId, rooms, updateColorPriorityForUsedColors]);

  const moveRoom = useCallback((roomId: string, x: number, y: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const updatedRooms = rooms.map(room => 
      room.id === roomId ? { ...room, x, y } : room
    );
    setRooms(updatedRooms);
    
    // Regenerate ALL edges with segmentation based on all rooms (including moved room)
    const allEdges: Edge[] = [];
    for (const room of updatedRooms) {
      const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
      allEdges.push(...roomEdges);
    }
    setEdges(allEdges);
  }, [rooms]);

  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    const updatedRooms = rooms.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    );
    setRooms(updatedRooms);
    
    // Update color priority if color changed
    if (updates.color !== undefined) {
      updateColorPriorityForUsedColors(updatedRooms);
    }
    
    // Regenerate edges if dimensions or position changed
    if (updates.width !== undefined || updates.height !== undefined || 
        updates.x !== undefined || updates.y !== undefined) {
      // Regenerate ALL edges with segmentation based on all rooms
      const allEdges: Edge[] = [];
      for (const room of updatedRooms) {
        const roomEdges = CanvasUtils.generateSegmentedRoomEdges(room, updatedRooms);
        allEdges.push(...roomEdges);
      }
      setEdges(allEdges);
    }
  }, [rooms, updateColorPriorityForUsedColors]);

  const updateEdge = useCallback((edgeId: string, updates: Partial<Edge>) => {
    setEdges(prev => prev.map(edge => 
      edge.id === edgeId ? { ...edge, ...updates } : edge
    ));
  }, []);

  const getEdgeColor = useCallback((edge: Edge): string => {
    return EdgeFightingResolver.resolveEdgeColor(
      edge, rooms, mode, colorPriority, conflictMatrix
    );
  }, [rooms, mode, colorPriority, conflictMatrix]);

  const getRoomAt = useCallback((x: number, y: number): Room | undefined => {
    return rooms.find(room => CanvasUtils.isPointInRoom({ x, y }, room));
  }, [rooms]);

  const getEdgeAt = useCallback((x: number, y: number): Edge | undefined => {
    // Simple edge detection - check if point is near edge line
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

  const exportData = useCallback(() => {
    const data = {
      rooms,
      edges,
      mode,
      colorPriority,
      conflictMatrix,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edge-conflict-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [rooms, edges, mode, colorPriority, conflictMatrix]);

  const importData = useCallback((data: any) => {
    try {
      if (data.rooms) setRooms(data.rooms);
      if (data.edges) setEdges(data.edges);
      if (data.mode) setMode(data.mode);
      if (data.colorPriority) setColorPriority(data.colorPriority);
      if (data.conflictMatrix) setConflictMatrix(data.conflictMatrix);
      
      // Update next room ID
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

  return {
    rooms,
    edges,
    mode,
    colorPriority,
    conflictMatrix,
    selectedTool,
    selectedColor,
    selectedRoomId,
    selectedEdgeId,
    showGrid,
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
    setShowGrid,
    exportData,
    importData,
    getEdgeColor,
    getRoomAt,
    getEdgeAt,
  };
}
