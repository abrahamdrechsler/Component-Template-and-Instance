import { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasUtils } from '@/lib/canvas-utils';
import { Room, Edge } from '@shared/schema';
import { Point, CanvasState } from '@/types/room';
import { RoomValidation } from '@/lib/room-validation';

interface DrawingCanvasProps {
  rooms: Room[];
  edges: Edge[];
  selectedTool: 'draw' | 'move' | 'delete';
  selectedColor: string;
  selectedRoomId?: string;
  selectedEdgeId?: string;
  showGrid: boolean;
  edgeAuthoring: boolean;
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
  edgeAuthoring,
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
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);

  const gridSize = 20; // 20px = 1ft

  // Handle keyboard events for delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedRoomId) {
        event.preventDefault();
        onDeleteRoom(selectedRoomId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoomId, onDeleteRoom]);

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
      // Skip edges for room being dragged - we'll draw preview edges instead
      if (canvasState.isDragging && edge.roomId === selectedRoomId) {
        return;
      }
      const color = getEdgeColor(edge);
      CanvasUtils.drawEdge(ctx, edge, gridSize, color);
    });

    // Draw preview edges for dragged room
    if (canvasState.isDragging && selectedRoomId && canvasState.dragStartOffset && mousePos) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        const currentGridPos = CanvasUtils.getGridCoordinates(mousePos, gridSize);
        const targetX = currentGridPos.x - canvasState.dragStartOffset.x;
        const targetY = currentGridPos.y - canvasState.dragStartOffset.y;
        
        // Use constrained position for preview edges (same as room outline)
        const otherRooms = rooms.filter(r => r.id !== room.id);
        const constrainedPos = RoomValidation.getValidDragPosition(room, targetX, targetY, otherRooms);
        
        const previewRoom = {
          ...room,
          x: constrainedPos.x,
          y: constrainedPos.y,
        };
        
        const previewEdges = CanvasUtils.generateRoomEdges(previewRoom);
        
        previewEdges.forEach(edge => {
          const color = getEdgeColor(edge);
          ctx.globalAlpha = 0.7; // Make preview semi-transparent
          CanvasUtils.drawEdge(ctx, edge, gridSize, color);
          ctx.globalAlpha = 1.0;
        });
      }
    }

    // Highlight selected room and show drag preview
    if (selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        let roomX = room.x;
        let roomY = room.y;
        
        // Show drag preview if actively dragging
        if (canvasState.isDragging && canvasState.dragStartOffset && mousePos) {
          const currentGridPos = CanvasUtils.getGridCoordinates(mousePos, gridSize);
          const targetX = currentGridPos.x - canvasState.dragStartOffset.x;
          const targetY = currentGridPos.y - canvasState.dragStartOffset.y;
          
          // Only show valid preview positions - constrain to valid locations
          const otherRooms = rooms.filter(r => r.id !== room.id);
          const constrainedPos = RoomValidation.getValidDragPosition(room, targetX, targetY, otherRooms);
          
          roomX = constrainedPos.x;
          roomY = constrainedPos.y;
        }
        
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        const x = roomX * gridSize;
        const y = roomY * gridSize;
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

    // Draw edge selection dots for selected room when edge authoring is enabled
    if (edgeAuthoring && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        const roomEdges = edges.filter(e => e.roomId === selectedRoomId);
        roomEdges.forEach(edge => {
          const dotPosition = CanvasUtils.getEdgeDotPosition(edge, gridSize);
          const isHovered = hoveredDot === edge.id;
          CanvasUtils.drawEdgeDot(ctx, dotPosition, gridSize, isHovered);
        });
      }
    }

    // Draw preview when drawing
    if (canvasState.isDrawing && canvasState.drawStart && mousePos) {
      const snappedStart = CanvasUtils.snapToGrid(canvasState.drawStart, gridSize);
      const snappedEnd = CanvasUtils.snapToGrid(mousePos, gridSize);
      
      const width = Math.abs(snappedEnd.x - snappedStart.x) / gridSize;
      const height = Math.abs(snappedEnd.y - snappedStart.y) / gridSize;
      const x = Math.min(snappedStart.x, snappedEnd.x) / gridSize;
      const y = Math.min(snappedStart.y, snappedEnd.y) / gridSize;
      
      // Create preview room to check validity
      const previewRoom: Room = {
        id: 'preview',
        name: 'Preview',
        x, y, width, height,
        color: 'skyBlue',
        createdAt: Date.now(),
      };
      
      // Get valid position (may snap to nearest valid location)
      const validPosition = RoomValidation.getNearestValidPosition(previewRoom, x, y, rooms);
      
      // Draw preview rectangle at valid position
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        validPosition.x * gridSize, 
        validPosition.y * gridSize, 
        width * gridSize, 
        height * gridSize
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
    mousePos,
    getEdgeColor,
    gridSize,
  ]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    setMousePos(point);

    // Check for edge dot hover when edge authoring is enabled and room is selected
    if (edgeAuthoring && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        const roomEdges = edges.filter(e => e.roomId === selectedRoomId);
        let foundHover = null;
        
        for (const edge of roomEdges) {
          const dotPosition = CanvasUtils.getEdgeDotPosition(edge, gridSize);
          if (CanvasUtils.isPointNearEdgeDot(point, dotPosition, gridSize)) {
            foundHover = edge.id;
            break;
          }
        }
        
        setHoveredDot(foundHover);
      }
    } else {
      setHoveredDot(null);
    }

    // Start dragging when mouse moves after mousedown in move mode
    if (selectedTool === 'move' && canvasState.dragStart && !canvasState.isDragging && selectedRoomId) {
      const deltaX = Math.abs(gridPoint.x - canvasState.dragStart.x);
      const deltaY = Math.abs(gridPoint.y - canvasState.dragStart.y);
      
      // Start dragging if mouse moved at least 1 grid unit
      if (deltaX >= 1 || deltaY >= 1) {
        setCanvasState(prev => ({
          ...prev,
          isDragging: true,
        }));
      }
    }
  }, [selectedTool, canvasState.dragStart, canvasState.isDragging, selectedRoomId, gridSize, edgeAuthoring, rooms, edges]);

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
            isDragging: false, // Don't start dragging until mouse moves
            dragStart: gridPoint,
            dragStartOffset: {
              x: gridPoint.x - roomToMove.x,
              y: gridPoint.y - roomToMove.y
            }
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

    if (canvasState.isDragging && canvasState.dragStartOffset && selectedRoomId) {
      const room = rooms.find(r => r.id === selectedRoomId);
      if (room) {
        const targetX = gridPoint.x - canvasState.dragStartOffset.x;
        const targetY = gridPoint.y - canvasState.dragStartOffset.y;
        
        // Use the same constrained position logic as the preview
        const otherRooms = rooms.filter(r => r.id !== room.id);
        const finalPosition = RoomValidation.getValidDragPosition(room, targetX, targetY, otherRooms);
        
        // Move to the constrained position (same as what was previewed)
        onMoveRoom(selectedRoomId, finalPosition.x, finalPosition.y);
      }
    }

    setCanvasState(prev => ({
      ...prev,
      isDrawing: false,
      drawStart: null,
      isDragging: false,
      dragStart: null,
      dragStartOffset: undefined,
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

      // Check for edge dot click first when edge authoring is enabled and room is selected
      if (edgeAuthoring && selectedRoomId) {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (room) {
          const roomEdges = edges.filter(e => e.roomId === selectedRoomId);
          
          for (const edge of roomEdges) {
            const dotPosition = CanvasUtils.getEdgeDotPosition(edge, gridSize);
            if (CanvasUtils.isPointNearEdgeDot(point, dotPosition, gridSize)) {
              onSelectEdge(edge.id);
              return;
            }
          }
        }
      }

      // Check for edge selection
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
  }, [selectedTool, getRoomAt, getEdgeAt, onSelectRoom, onSelectEdge, gridSize, edgeAuthoring, selectedRoomId, rooms, edges]);

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

  // Handle keyboard events for arrow key movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedRoomId) return;
      
      const room = rooms.find(r => r.id === selectedRoomId);
      if (!room) return;

      let deltaX = 0;
      let deltaY = 0;

      switch (event.key) {
        case 'ArrowUp':
          deltaY = -1;
          break;
        case 'ArrowDown':
          deltaY = 1;
          break;
        case 'ArrowLeft':
          deltaX = -1;
          break;
        case 'ArrowRight':
          deltaX = 1;
          break;
        default:
          return; // Don't prevent default for other keys
      }

      event.preventDefault();
      
      const newX = room.x + deltaX;
      const newY = room.y + deltaY;
      
      // Only move if exact target position is valid (no snapping for arrow keys)
      if (RoomValidation.isValidArrowKeyMove(room, newX, newY, rooms)) {
        onMoveRoom(selectedRoomId, newX, newY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoomId, rooms, onMoveRoom]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className={`border border-gray-300 outline-none ${
          selectedTool === 'draw' ? 'cursor-crosshair' :
          selectedTool === 'move' ? 'cursor-grab' :
          hoveredDot ? 'cursor-pointer' :
          'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
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
