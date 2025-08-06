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
  const [colorPriority, setColorPriority] = useState<RoomColor[]>([...DEFAULT_COLOR_PRIORITY]);
  const [conflictMatrix, setConflictMatrix] = useState<ConflictMatrixEntry[]>([]);
  const [selectedTool, setSelectedTool] = useState<'draw' | 'move' | 'delete'>('draw');
  const [selectedColor, setSelectedColor] = useState<RoomColor>('blue');
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | undefined>();
  const [showGrid, setShowGrid] = useState(true);

  const nextRoomIdRef = useRef(1);

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

    setRooms(prev => [...prev, newRoom]);
    
    // Generate edges for the new room
    const newEdges = CanvasUtils.generateRoomEdges(newRoom);
    setEdges(prev => [...prev, ...newEdges]);
  }, [selectedColor, rooms]);

  const deleteRoom = useCallback((roomId: string) => {
    setRooms(prev => prev.filter(room => room.id !== roomId));
    setEdges(prev => prev.filter(edge => edge.roomId !== roomId));
    
    if (selectedRoomId === roomId) {
      setSelectedRoomId(undefined);
    }
  }, [selectedRoomId]);

  const moveRoom = useCallback((roomId: string, x: number, y: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    // Validate room movement
    if (!RoomValidation.isValidRoomMove(room, x, y, rooms)) {
      // Don't move if position is invalid
      return;
    }

    setRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, x, y } : room
    ));
    
    // Update edges for the moved room
    const updatedRoom = { ...room, x, y };
    const newEdges = CanvasUtils.generateRoomEdges(updatedRoom);
    setEdges(prev => [
      ...prev.filter(edge => edge.roomId !== roomId),
      ...newEdges
    ]);
  }, [rooms]);

  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(room => 
      room.id === roomId ? { ...room, ...updates } : room
    ));
    
    // Regenerate edges if dimensions changed
    if (updates.width !== undefined || updates.height !== undefined || 
        updates.x !== undefined || updates.y !== undefined) {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        const updatedRoom = { ...room, ...updates };
        const newEdges = CanvasUtils.generateRoomEdges(updatedRoom);
        setEdges(prev => [
          ...prev.filter(edge => edge.roomId !== roomId),
          ...newEdges
        ]);
      }
    }
  }, [rooms]);

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
