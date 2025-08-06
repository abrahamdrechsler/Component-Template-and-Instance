import { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasUtils } from '@/lib/canvas-utils';
import { Room, Edge } from '@shared/schema';
import { Point, CanvasState } from '@/types/room';

interface DrawingCanvasProps {
  rooms: Room[];
  edges: Edge[];
  selectedTool: 'draw' | 'move' | 'delete';
  selectedColor: string;
  selectedRoomId?: string;
  selectedEdgeId?: string;
  showGrid: boolean;
  onAddRoom: (x: number, y: number, width: number, height: number) => void;
  onMoveRoom: (roomId: string, x: number, y: number) => void;
  onDeleteRoom: (roomId: string) => void;
  onSelectRoom: (roomId: string | undefined) => void;
  onSelectEdge: (edgeId: string | undefined) => void;
  getEdgeColor: (edge: Edge) => string;
  getRoomAt: (x: number, y: number) => Room | undefined;
  getEdgeAt: (x: number, y: number) => Edge | undefined;
}

export function DrawingCanvas({
  rooms,
  edges,
  selectedTool,
  selectedColor,
  selectedRoomId,
  selectedEdgeId,
  showGrid,
  onAddRoom,
  onMoveRoom,
  onDeleteRoom,
  onSelectRoom,
  onSelectEdge,
  getEdgeColor,
  getRoomAt,
  getEdgeAt,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDragging: false,
    dragStart: null,
    isDrawing: false,
    drawStart: null,
  });

  const gridSize = 20; // 20px = 1ft

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    if (showGrid) {
      CanvasUtils.drawGrid(ctx, canvas.width, canvas.height, gridSize);
    }

    // Draw room edges with resolved colors
    edges.forEach(edge => {
      const color = getEdgeColor(edge);
      CanvasUtils.drawEdge(ctx, edge, gridSize, color);
    });

    // Highlight selected room
    if (selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        const x = room.x * gridSize;
        const y = room.y * gridSize;
        const width = room.width * gridSize;
        const height = room.height * gridSize;
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);
      }
    }

    // Highlight selected edge
    if (selectedEdgeId) {
      const edge = edges.find(e => e.id === selectedEdgeId);
      if (edge) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = gridSize + 4;
        ctx.beginPath();
        ctx.moveTo(edge.x1 * gridSize, edge.y1 * gridSize);
        ctx.lineTo(edge.x2 * gridSize, edge.y2 * gridSize);
        ctx.stroke();
      }
    }

    // Draw preview when drawing
    if (canvasState.isDrawing && canvasState.drawStart) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      
      const mousePos = canvasState.drawStart;
      const snappedStart = CanvasUtils.snapToGrid(mousePos, gridSize);
      
      // Draw preview rectangle (simplified)
      ctx.strokeRect(
        snappedStart.x,
        snappedStart.y,
        gridSize * 4, // Default preview size
        gridSize * 3
      );
      ctx.setLineDash([]);
    }
  }, [
    rooms,
    edges,
    selectedRoomId,
    selectedEdgeId,
    selectedColor,
    showGrid,
    canvasState,
    getEdgeColor,
    gridSize,
  ]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

    switch (selectedTool) {
      case 'draw':
        setCanvasState(prev => ({
          ...prev,
          isDrawing: true,
          drawStart: point,
        }));
        break;

      case 'move':
        const roomToMove = getRoomAt(gridPoint.x, gridPoint.y);
        if (roomToMove) {
          onSelectRoom(roomToMove.id);
          setCanvasState(prev => ({
            ...prev,
            isDragging: true,
            dragStart: gridPoint,
          }));
        }
        break;

      case 'delete':
        const roomToDelete = getRoomAt(gridPoint.x, gridPoint.y);
        if (roomToDelete) {
          onDeleteRoom(roomToDelete.id);
        }
        break;
    }
  }, [selectedTool, getRoomAt, onSelectRoom, onDeleteRoom, gridSize]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

    if (canvasState.isDrawing && canvasState.drawStart) {
      const startGrid = CanvasUtils.getGridCoordinates(canvasState.drawStart, gridSize);
      const width = Math.max(1, Math.abs(gridPoint.x - startGrid.x));
      const height = Math.max(1, Math.abs(gridPoint.y - startGrid.y));
      const x = Math.min(startGrid.x, gridPoint.x);
      const y = Math.min(startGrid.y, gridPoint.y);
      
      onAddRoom(x, y, width, height);
    }

    if (canvasState.isDragging && canvasState.dragStart && selectedRoomId) {
      const deltaX = gridPoint.x - canvasState.dragStart.x;
      const deltaY = gridPoint.y - canvasState.dragStart.y;
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        onMoveRoom(selectedRoomId, room.x + deltaX, room.y + deltaY);
      }
    }

    setCanvasState(prev => ({
      ...prev,
      isDrawing: false,
      drawStart: null,
      isDragging: false,
      dragStart: null,
    }));
  }, [
    canvasState,
    selectedRoomId,
    rooms,
    onAddRoom,
    onMoveRoom,
    gridSize,
  ]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedTool !== 'draw' && selectedTool !== 'move' && selectedTool !== 'delete') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
      const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

      // Check for edge selection first
      const edge = getEdgeAt(gridPoint.x, gridPoint.y);
      if (edge) {
        onSelectEdge(edge.id);
        onSelectRoom(undefined);
        return;
      }

      // Then check for room selection
      const room = getRoomAt(gridPoint.x, gridPoint.y);
      if (room) {
        onSelectRoom(room.id);
        onSelectEdge(undefined);
      } else {
        onSelectRoom(undefined);
        onSelectEdge(undefined);
      }
    }
  }, [selectedTool, getRoomAt, getEdgeAt, onSelectRoom, onSelectEdge, gridSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        draw();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className={`border border-gray-300 ${
          selectedTool === 'draw' ? 'cursor-crosshair' :
          selectedTool === 'move' ? 'cursor-grab' :
          'cursor-pointer'
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      />
      
      {/* Grid Scale Indicator */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs text-gray-600 border">
        Grid: 1 square = 1 ft
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-2 left-2 flex flex-col space-y-1">
        <button className="bg-white bg-opacity-90 hover:bg-white p-2 rounded border shadow-sm transition-colors">
          <i className="fas fa-plus text-xs text-gray-600"></i>
        </button>
        <button className="bg-white bg-opacity-90 hover:bg-white p-2 rounded border shadow-sm transition-colors">
          <i className="fas fa-minus text-xs text-gray-600"></i>
        </button>
        <button className="bg-white bg-opacity-90 hover:bg-white p-2 rounded border shadow-sm transition-colors">
          <i className="fas fa-home text-xs text-gray-600"></i>
        </button>
      </div>
    </div>
  );
}
