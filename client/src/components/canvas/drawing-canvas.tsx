import { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasUtils } from '@/lib/canvas-utils';
import { Room, Edge, ComponentTemplate, ComponentInstance } from '@shared/schema';
import { Point, CanvasState } from '@/types/room';
import { RoomValidation } from '@/lib/room-validation';

interface DrawingCanvasProps {
  rooms: Room[];
  edges: Edge[];
  selectedTool: 'draw' | 'move' | 'delete' | 'select';
  selectedColor: string;
  selectedRoomId?: string;
  selectedEdgeId?: string;
  selectedRoomIds?: string[];
  selectedInstanceId?: string;
  showGrid: boolean;
  cornerPriorities: Record<string, 'horizontal' | 'vertical'>;
  componentTemplates: ComponentTemplate[];
  componentInstances: ComponentInstance[];
  creationMode: 'template-is-first-instance' | 'all-instances-are-templates' | 'template-is-separate-file';
  isEditingTemplate: boolean;
  editingTemplateId?: string;
  editingInstanceId?: string;
  isSelectingOrigin: boolean;
  templateOriginX?: number;
  templateOriginY?: number;
  onAddRoom: (x: number, y: number, width: number, height: number) => void;
  onMoveRoom: (roomId: string, x: number, y: number) => void;
  onDeleteRoom: (roomId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onSelectRoom: (roomId: string | undefined) => void;
  onSelectEdge: (edgeId: string | undefined) => void;
  onSelectRoomIds?: (roomIds: string[]) => void;
  onSelectInstance: (instanceId: string | undefined) => void;
  onMoveInstance: (instanceId: string, x: number, y: number) => void;
  onToggleCornerPriority: (x: number, y: number) => void;
  onPlaceInstance: (templateId: string, x: number, y: number) => void;
  onEnterTemplateEditMode: (templateId: string, instanceId?: string) => void;
  onSelectOrigin: (x: number, y: number) => void;
  onSetTemplateOrigin: (x: number, y: number) => void;
  getEdgeColor: (edge: Edge) => string;
  getRoomAt: (x: number, y: number) => Room | undefined;
  getEdgeAt: (x: number, y: number) => Edge | undefined;
  getInstanceAt: (x: number, y: number) => ComponentInstance | undefined;
}

export function DrawingCanvas({
  rooms,
  edges,
  selectedTool,
  selectedColor,
  selectedRoomId,
  selectedEdgeId,
  selectedRoomIds = [],
  selectedInstanceId,
  showGrid,
  cornerPriorities,
  componentTemplates,
  componentInstances,
  creationMode,
  isEditingTemplate,
  editingTemplateId,
  editingInstanceId,
  isSelectingOrigin,
  templateOriginX,
  templateOriginY,
  onAddRoom,
  onMoveRoom,
  onDeleteRoom,
  onDeleteInstance,
  onSelectRoom,
  onSelectEdge,
  onSelectRoomIds,
  onSelectInstance,
  onMoveInstance,
  onToggleCornerPriority,
  onPlaceInstance,
  onEnterTemplateEditMode,
  onSelectOrigin,
  onSetTemplateOrigin,
  getEdgeColor,
  getRoomAt,
  getEdgeAt,
  getInstanceAt,
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
  const [hoveredCorner, setHoveredCorner] = useState<{x: number, y: number} | null>(null);
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  const [dragPreviewPos, setDragPreviewPos] = useState<Point | null>(null);

  const gridSize = 20; // 20px = 1ft

  // Handle keyboard events for delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete') {
        event.preventDefault();
        
        // Prevent deletion during template editing mode
        if (isEditingTemplate) {
          return;
        }
        
        if (selectedRoomId) {
          // Delete selected room
          onDeleteRoom(selectedRoomId);
        } else if (selectedInstanceId) {
          // Delete selected template instance
          const instance = componentInstances.find(i => i.id === selectedInstanceId);
          if (instance) {
            onDeleteInstance(selectedInstanceId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoomId, selectedInstanceId, componentInstances, onDeleteRoom, onDeleteInstance, isEditingTemplate]);

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
      
      // In template editing mode, handle edges differently
      if (isEditingTemplate && editingTemplateId) {
        if (edge.roomId.startsWith('editing-')) {
          // This is a temporary editing room edge - show normally
          const color = getEdgeColor(edge);
          CanvasUtils.drawEdge(ctx, edge, gridSize, color, cornerPriorities, rooms);
        } else {
          // Check if this edge belongs to the original template being edited
          const template = componentTemplates.find(t => t.id === editingTemplateId);
          if (template && template.roomIds.includes(edge.roomId)) {
            // This is an original template room edge - hide it completely during editing
            return;
          }
          
          // This is a non-editing edge - show greyed out with no color
          ctx.globalAlpha = 0.15;
          CanvasUtils.drawEdge(ctx, edge, gridSize, '#9CA3AF', cornerPriorities, rooms);
          ctx.globalAlpha = 1.0;
        }
        return;
      }
      
      // In "all-instances-are-templates" mode, hide template room edges (they're shown as instances)
      // ALWAYS hide original template room edges in this mode, even during editing
      if (creationMode === 'all-instances-are-templates') {
        const isTemplateRoom = componentTemplates.some(t => t.roomIds.includes(edge.roomId));
        if (isTemplateRoom) {
          return;
        }
      }
      
      // Normal mode - show all edges
      const color = getEdgeColor(edge);
      CanvasUtils.drawEdge(ctx, edge, gridSize, color, cornerPriorities, rooms);
    });

    // Draw component instances
    componentInstances.forEach(instance => {
      const template = componentTemplates.find(t => t.id === instance.templateId);
      if (template) {
        const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
        if (templateRooms.length > 0) {
          // In edit mode, grey out ALL instances heavily with no color
          if (isEditingTemplate) {
            ctx.globalAlpha = 0.08;
          }
          
          // Calculate bounding box of original template
          const minX = Math.min(...templateRooms.map(r => r.x));
          const minY = Math.min(...templateRooms.map(r => r.y));
          const maxX = Math.max(...templateRooms.map(r => r.x + r.width));
          const maxY = Math.max(...templateRooms.map(r => r.y + r.height));
          
          // Draw room edges with colors at the instance position (same as originals)
          templateRooms.forEach(room => {
            const offsetX = room.x - minX;
            const offsetY = room.y - minY;
            
            // Get edges for this room and draw them at instance position
            const roomEdges = edges.filter(e => e.roomId === room.id);
            roomEdges.forEach(edge => {
              // In edit mode, use grey color for instances
              const color = isEditingTemplate ? '#9CA3AF' : getEdgeColor(edge);
              // Create a translated edge at the instance position
              const instanceEdge = {
                ...edge,
                x1: edge.x1 - minX + instance.x,
                y1: edge.y1 - minY + instance.y,
                x2: edge.x2 - minX + instance.x,
                y2: edge.y2 - minY + instance.y,
              };
              CanvasUtils.drawEdge(ctx, instanceEdge, gridSize, color, cornerPriorities, rooms);
            });
          });
          
          // Draw a single 75% transparent blue overlay over the combined shape
          ctx.save();
          
          // First, create a clipping region from all rooms (this prevents overlapping fills)
          ctx.beginPath();
          templateRooms.forEach(room => {
            const offsetX = room.x - minX;
            const offsetY = room.y - minY;
            const instanceX = (instance.x + offsetX) * gridSize;
            const instanceY = (instance.y + offsetY) * gridSize;
            const width = room.width * gridSize;
            const height = room.height * gridSize;
            ctx.rect(instanceX, instanceY, width, height);
          });
          ctx.clip();
          
          // Calculate bounding box to fill the entire clipped region at once
          const minInstanceX = Math.min(...templateRooms.map(r => (instance.x + (r.x - minX)) * gridSize));
          const minInstanceY = Math.min(...templateRooms.map(r => (instance.y + (r.y - minY)) * gridSize));
          const maxInstanceX = Math.max(...templateRooms.map(r => (instance.x + (r.x - minX) + r.width) * gridSize));
          const maxInstanceY = Math.max(...templateRooms.map(r => (instance.y + (r.y - minY) + r.height) * gridSize));
          
          // Fill with transparent overlay - blue normally, grey during edit mode
          const fillColor = isEditingTemplate ? 'rgba(156, 163, 175, 0.15)' : 'rgba(59, 130, 246, 0.25)';
          ctx.fillStyle = fillColor;
          ctx.fillRect(minInstanceX, minInstanceY, maxInstanceX - minInstanceX, maxInstanceY - minInstanceY);
          
          ctx.restore();
          
          // Draw selection highlight if this instance is selected - trace outer perimeter only
          if (selectedInstanceId === instance.id) {
            // Build a set of all occupied grid cells
            const occupiedCells = new Set<string>();
            templateRooms.forEach(room => {
              const offsetX = room.x - minX;
              const offsetY = room.y - minY;
              for (let x = instance.x + offsetX; x < instance.x + offsetX + room.width; x++) {
                for (let y = instance.y + offsetY; y < instance.y + offsetY + room.height; y++) {
                  occupiedCells.add(`${x},${y}`);
                }
              }
            });
            
            // Find all external edges by checking each cell's borders
            const externalEdges: { x1: number, y1: number, x2: number, y2: number }[] = [];
            
            templateRooms.forEach(room => {
              const offsetX = room.x - minX;
              const offsetY = room.y - minY;
              const roomLeft = instance.x + offsetX;
              const roomTop = instance.y + offsetY;
              
              for (let x = roomLeft; x < roomLeft + room.width; x++) {
                for (let y = roomTop; y < roomTop + room.height; y++) {
                  // Check each of the 4 edges of this cell
                  
                  // Top edge - external if no cell above
                  if (!occupiedCells.has(`${x},${y - 1}`)) {
                    externalEdges.push({ x1: x, y1: y, x2: x + 1, y2: y });
                  }
                  
                  // Bottom edge - external if no cell below
                  if (!occupiedCells.has(`${x},${y + 1}`)) {
                    externalEdges.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1 });
                  }
                  
                  // Left edge - external if no cell to left
                  if (!occupiedCells.has(`${x - 1},${y}`)) {
                    externalEdges.push({ x1: x, y1: y, x2: x, y2: y + 1 });
                  }
                  
                  // Right edge - external if no cell to right
                  if (!occupiedCells.has(`${x + 1},${y}`)) {
                    externalEdges.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 });
                  }
                }
              }
            });
            
            // Draw the perimeter with dashed blue line
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            
            externalEdges.forEach(edge => {
              ctx.beginPath();
              ctx.moveTo(edge.x1 * gridSize, edge.y1 * gridSize);
              ctx.lineTo(edge.x2 * gridSize, edge.y2 * gridSize);
              ctx.stroke();
            });
            
            ctx.setLineDash([]);
          }
          
          // Reset alpha after drawing instance
          ctx.globalAlpha = 1.0;
        }
      }
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
        
        // Generate preview edges with preserved custom properties
        const previewEdges = CanvasUtils.generateRoomEdges(previewRoom);
        
        // Apply existing edge overrides (colors, names) to preview edges
        const originalRoomEdges = edges.filter(e => e.roomId === selectedRoomId);
        previewEdges.forEach(previewEdge => {
          // Find matching original edge by side
          const originalEdge = originalRoomEdges.find(e => e.side === previewEdge.side);
          if (originalEdge) {
            if (originalEdge.colorOverride) previewEdge.colorOverride = originalEdge.colorOverride;
            if (originalEdge.name) previewEdge.name = originalEdge.name;
          }
        });
        
        previewEdges.forEach(edge => {
          const color = getEdgeColor(edge);
          ctx.globalAlpha = 0.7; // Make preview semi-transparent
          CanvasUtils.drawEdge(ctx, edge, gridSize, color, cornerPriorities);
          ctx.globalAlpha = 1.0;
        });
      }
    }

    // Highlight selected room(s) and show drag preview
    const roomsToHighlight = selectedTool === 'select' && selectedRoomIds.length > 0 
      ? selectedRoomIds 
      : (selectedRoomId ? [selectedRoomId] : []);

    roomsToHighlight.forEach(roomId => {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        let roomX = room.x;
        let roomY = room.y;
        
        // Show drag preview if actively dragging this specific room
        if (canvasState.isDragging && canvasState.dragStartOffset && mousePos && roomId === selectedRoomId) {
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
    });

    // Show drag preview for selected component instance
    if (selectedInstanceId && canvasState.isDragging && canvasState.dragStartOffset && mousePos) {
      const instance = componentInstances.find(i => i.id === selectedInstanceId);
      const template = instance ? componentTemplates.find(t => t.id === instance.templateId) : undefined;
      
      if (instance && template) {
        const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
        if (templateRooms.length > 0) {
          // Calculate template origin
          const minX = Math.min(...templateRooms.map(r => r.x));
          const minY = Math.min(...templateRooms.map(r => r.y));
          
          // Calculate preview position
          const currentGridPos = CanvasUtils.getGridCoordinates(mousePos, gridSize);
          const previewX = currentGridPos.x - canvasState.dragStartOffset.x;
          const previewY = currentGridPos.y - canvasState.dragStartOffset.y;
          
          // Constrain to grid (no negative coordinates)
          let targetX = Math.max(0, previewX);
          let targetY = Math.max(0, previewY);
          
          // Create virtual rooms for all OTHER instances
          const otherInstanceRooms: Room[] = [];
          componentInstances.forEach(otherInstance => {
            if (otherInstance.id !== selectedInstanceId) {
              const otherTemplate = componentTemplates.find(t => t.id === otherInstance.templateId);
              if (otherTemplate) {
                const otherTemplateRooms = rooms.filter(r => otherTemplate.roomIds.includes(r.id));
                if (otherTemplateRooms.length > 0) {
                  const otherMinX = Math.min(...otherTemplateRooms.map(r => r.x));
                  const otherMinY = Math.min(...otherTemplateRooms.map(r => r.y));
                  
                  otherTemplateRooms.forEach(room => {
                    const offsetX = room.x - otherMinX;
                    const offsetY = room.y - otherMinY;
                    otherInstanceRooms.push({
                      ...room,
                      id: `virtual-${otherInstance.id}-${room.id}`,
                      x: otherInstance.x + offsetX,
                      y: otherInstance.y + offsetY,
                    });
                  });
                }
              }
            }
          });
          
          // Get all regular rooms (not part of any template)
          const allTemplateRoomIds = new Set<string>();
          componentTemplates.forEach(t => t.roomIds.forEach(id => allTemplateRoomIds.add(id)));
          const regularRooms = rooms.filter(r => !allTemplateRoomIds.has(r.id));
          
          // Combine regular rooms and other instance rooms for collision detection
          const roomsToCheckAgainst = [...regularRooms, ...otherInstanceRooms];
          
          // Helper function to check if an instance position is valid
          const isInstancePositionValid = (x: number, y: number): boolean => {
            for (const templateRoom of templateRooms) {
              const offsetX = templateRoom.x - minX;
              const offsetY = templateRoom.y - minY;
              const movedRoom: Room = {
                ...templateRoom,
                x: x + offsetX,
                y: y + offsetY,
              };
              if (!RoomValidation.isValidRoomPlacement(movedRoom, roomsToCheckAgainst)) {
                return false;
              }
            }
            return true;
          };
          
          // Find nearest valid position (similar to room drag behavior)
          let bestX = targetX;
          let bestY = targetY;
          
          if (!isInstancePositionValid(targetX, targetY)) {
            // Search in expanding grid for nearest valid position
            const searchRadius = 10;
            let found = false;
            let bestDistance = Infinity;
            
            for (let dx = -searchRadius; dx <= searchRadius; dx++) {
              for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                const testX = targetX + dx;
                const testY = targetY + dy;
                
                // Skip negative positions
                if (testX < 0 || testY < 0) continue;
                
                if (isInstancePositionValid(testX, testY)) {
                  const distance = Math.abs(dx) + Math.abs(dy);
                  if (distance < bestDistance) {
                    bestDistance = distance;
                    bestX = testX;
                    bestY = testY;
                    found = true;
                  }
                }
              }
            }
            
            // If no valid position found in search radius, keep at current position
            if (!found) {
              bestX = instance.x;
              bestY = instance.y;
            }
          }
          
          // Draw blue dashed border preview around outer perimeter only at validated position
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          
          // Build a set of all occupied grid cells for the preview position
          const previewOccupiedCells = new Set<string>();
          templateRooms.forEach(room => {
            const offsetX = room.x - minX;
            const offsetY = room.y - minY;
            for (let x = bestX + offsetX; x < bestX + offsetX + room.width; x++) {
              for (let y = bestY + offsetY; y < bestY + offsetY + room.height; y++) {
                previewOccupiedCells.add(`${x},${y}`);
              }
            }
          });
          
          // Find all external edges for the preview
          const previewExternalEdges: { x1: number, y1: number, x2: number, y2: number }[] = [];
          
          templateRooms.forEach(room => {
            const offsetX = room.x - minX;
            const offsetY = room.y - minY;
            const roomLeft = bestX + offsetX;
            const roomTop = bestY + offsetY;
            
            for (let x = roomLeft; x < roomLeft + room.width; x++) {
              for (let y = roomTop; y < roomTop + room.height; y++) {
                // Check each of the 4 edges of this cell
                
                // Top edge - external if no cell above
                if (!previewOccupiedCells.has(`${x},${y - 1}`)) {
                  previewExternalEdges.push({ x1: x, y1: y, x2: x + 1, y2: y });
                }
                
                // Bottom edge - external if no cell below
                if (!previewOccupiedCells.has(`${x},${y + 1}`)) {
                  previewExternalEdges.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1 });
                }
                
                // Left edge - external if no cell to left
                if (!previewOccupiedCells.has(`${x - 1},${y}`)) {
                  previewExternalEdges.push({ x1: x, y1: y, x2: x, y2: y + 1 });
                }
                
                // Right edge - external if no cell to right
                if (!previewOccupiedCells.has(`${x + 1},${y}`)) {
                  previewExternalEdges.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 });
                }
              }
            }
          });
          
          // Draw the perimeter
          previewExternalEdges.forEach(edge => {
            ctx.beginPath();
            ctx.moveTo(edge.x1 * gridSize, edge.y1 * gridSize);
            ctx.lineTo(edge.x2 * gridSize, edge.y2 * gridSize);
            ctx.stroke();
          });
          
          ctx.setLineDash([]);
        }
      }
    }

    // Highlight selected edge with dashed blue line - show full room wall
    if (selectedEdgeId) {
      const edge = edges.find(e => e.id === selectedEdgeId);
      if (edge) {
        const room = rooms.find(r => r.id === edge.roomId);
        if (room) {
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          
          // Draw the full wall of the room based on the edge side
          let startX, startY, endX, endY;
          switch (edge.side) {
            case 'north':
              startX = room.x * gridSize;
              startY = room.y * gridSize;
              endX = (room.x + room.width) * gridSize;
              endY = room.y * gridSize;
              break;
            case 'south':
              startX = room.x * gridSize;
              startY = (room.y + room.height) * gridSize;
              endX = (room.x + room.width) * gridSize;
              endY = (room.y + room.height) * gridSize;
              break;
            case 'east':
              startX = (room.x + room.width) * gridSize;
              startY = room.y * gridSize;
              endX = (room.x + room.width) * gridSize;
              endY = (room.y + room.height) * gridSize;
              break;
            case 'west':
              startX = room.x * gridSize;
              startY = room.y * gridSize;
              endX = room.x * gridSize;
              endY = (room.y + room.height) * gridSize;
              break;
          }
          
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw edge selection dots (always enabled)
    // Show dots for selected room OR for the room that owns the selected edge
    // Hide dots during drag operations to avoid visual confusion
    if (!canvasState.isDragging) {
      let targetRoomId = selectedRoomId;
      
      // If no room selected but edge is selected, show dots for the edge's room
      if (!targetRoomId && selectedEdgeId) {
        const selectedEdge = edges.find(e => e.id === selectedEdgeId);
        if (selectedEdge) {
          targetRoomId = selectedEdge.roomId;
        }
      }
      
      if (targetRoomId) {
        const room = rooms.find(r => r.id === targetRoomId);
        if (room) {
          // Get one representative edge per side to show one dot per side
          const roomEdges = edges.filter(e => e.roomId === targetRoomId);
          const edgesBySide = new Map<string, Edge>();
          
          roomEdges.forEach(edge => {
            if (!edgesBySide.has(edge.side)) {
              edgesBySide.set(edge.side, edge);
            }
          });
          
          Array.from(edgesBySide.entries()).forEach(([side, edge]) => {
            const dotPosition = CanvasUtils.getEdgeDotPosition(room, side as any, gridSize);
            const isHovered = hoveredDot === edge.id;
            CanvasUtils.drawEdgeDot(ctx, dotPosition, gridSize, isHovered, side as any);
          });
        }
      }
    }

    // Draw corner hover preview
    if (hoveredCorner) {
      ctx.strokeStyle = '#3B82F6'; // Blue color
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      // Find which room this corner belongs to and adjust position for boundary corners
      const owningRoom = rooms.find(room => {
        // In template editing mode, only consider editing rooms
        if (isEditingTemplate && editingTemplateId && !room.id.startsWith('editing-')) {
          return false;
        }
        
        return (hoveredCorner.x === room.x && hoveredCorner.y === room.y) || // top-left
               (hoveredCorner.x === room.x + room.width && hoveredCorner.y === room.y) || // top-right
               (hoveredCorner.x === room.x && hoveredCorner.y === room.y + room.height) || // bottom-left
               (hoveredCorner.x === room.x + room.width && hoveredCorner.y === room.y + room.height); // bottom-right
      });
      
      let cornerX = hoveredCorner.x * gridSize;
      let cornerY = hoveredCorner.y * gridSize;
      
      // Adjust position for boundary corners to show preview on the interior side
      if (owningRoom) {
        // For right edge corners, move preview one cell left
        if (hoveredCorner.x === owningRoom.x + owningRoom.width) {
          cornerX -= gridSize;
        }
        // For bottom edge corners, move preview one cell up  
        if (hoveredCorner.y === owningRoom.y + owningRoom.height) {
          cornerY -= gridSize;
        }
      }
      
      // Draw a blue border around the corner cell
      ctx.strokeRect(cornerX, cornerY, gridSize, gridSize);
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

    // Draw template instance preview when dragging
    if (draggedTemplateId && dragPreviewPos) {
      const template = componentTemplates.find(t => t.id === draggedTemplateId);
      if (template) {
        const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
        if (templateRooms.length > 0) {
          // Calculate bounding box of template
          const minX = Math.min(...templateRooms.map(r => r.x));
          const minY = Math.min(...templateRooms.map(r => r.y));
          
          // Draw each room in the template at the preview position
          templateRooms.forEach(room => {
            const offsetX = room.x - minX;
            const offsetY = room.y - minY;
            const previewX = (dragPreviewPos.x + offsetX) * gridSize;
            const previewY = (dragPreviewPos.y + offsetY) * gridSize;
            const width = room.width * gridSize;
            const height = room.height * gridSize;
            
            // Draw semi-transparent preview
            ctx.fillStyle = room.color + '40'; // Add transparency
            ctx.fillRect(previewX, previewY, width, height);
            
            ctx.strokeStyle = room.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(previewX, previewY, width, height);
            ctx.setLineDash([]);
          });
        }
      }
    }

    // Draw template origin points
    // During origin selection or template editing, show the temporary origin point
    if ((isSelectingOrigin || isEditingTemplate) && templateOriginX !== undefined && templateOriginY !== undefined) {
      ctx.save();
      
      // Draw red circle for origin point
      ctx.beginPath();
      ctx.arc(templateOriginX * gridSize, templateOriginY * gridSize, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#EF4444'; // Red color
      ctx.fill();
      ctx.strokeStyle = '#DC2626'; // Darker red border
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw white dot in center
      ctx.beginPath();
      ctx.arc(templateOriginX * gridSize, templateOriginY * gridSize, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      
      ctx.restore();
    }
    
    // In "template-is-first-instance" mode, always show origin for first instance (the template)
    if (creationMode === 'template-is-first-instance' && !isSelectingOrigin && !isEditingTemplate) {
      componentTemplates.forEach(template => {
        // Find the first instance of this template (represents the template itself)
        const firstInstance = componentInstances.find(inst => inst.templateId === template.id);
        
        if (firstInstance && template.originX !== undefined && template.originY !== undefined) {
          // Calculate the absolute position of the origin relative to the first instance
          const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
          if (templateRooms.length > 0) {
            const minX = Math.min(...templateRooms.map(r => r.x));
            const minY = Math.min(...templateRooms.map(r => r.y));
            
            // Origin is relative to template position, so we need to translate it to the instance position
            const originX = firstInstance.x + (template.originX - minX);
            const originY = firstInstance.y + (template.originY - minY);
            
            ctx.save();
            
            // Draw red circle for origin point
            ctx.beginPath();
            ctx.arc(originX * gridSize, originY * gridSize, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#EF4444'; // Red color
            ctx.fill();
            ctx.strokeStyle = '#DC2626'; // Darker red border
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw white dot in center
            ctx.beginPath();
            ctx.arc(originX * gridSize, originY * gridSize, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            
            ctx.restore();
          }
        }
      });
    }
  }, [
    rooms,
    edges,
    selectedRoomId,
    selectedEdgeId,
    selectedRoomIds,
    selectedInstanceId,
    selectedTool,
    selectedColor,
    showGrid,
    canvasState,
    mousePos,
    hoveredDot,
    hoveredCorner,
    getEdgeColor,
    gridSize,
    draggedTemplateId,
    dragPreviewPos,
    componentTemplates,
    componentInstances,
    creationMode,
    isEditingTemplate,
    isSelectingOrigin,
    templateOriginX,
    templateOriginY,
  ]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    setMousePos(point);

    // Handle origin dragging
    if (canvasState.isDraggingOrigin) {
      onSetTemplateOrigin(gridPoint.x, gridPoint.y);
      return;
    }

    // Check for corner hover
    // Only check hover when not dragging to avoid interference
    if (!canvasState.isDragging) {
      // Check for corner hover first
      let foundCornerHover: {x: number, y: number} | null = null;
      
      for (const room of rooms) {
        // In template editing mode, only detect corners for editing rooms
        if (isEditingTemplate && editingTemplateId && !room.id.startsWith('editing-')) {
          continue;
        }
        
        // Check each corner of the room
        const corners = [
          {x: room.x, y: room.y}, // top-left
          {x: room.x + room.width, y: room.y}, // top-right
          {x: room.x, y: room.y + room.height}, // bottom-left
          {x: room.x + room.width, y: room.y + room.height}, // bottom-right
        ];
        
        for (const corner of corners) {
          let cornerPixelX = corner.x * gridSize;
          let cornerPixelY = corner.y * gridSize;
          
          // Adjust detection area to match where the preview will be shown
          // For right edge corners, check one cell left
          if (corner.x === room.x + room.width) {
            cornerPixelX -= gridSize;
          }
          // For bottom edge corners, check one cell up  
          if (corner.y === room.y + room.height) {
            cornerPixelY -= gridSize;
          }
          
          // Check if mouse is within the corner cell (grid square)
          if (point.x >= cornerPixelX && point.x < cornerPixelX + gridSize &&
              point.y >= cornerPixelY && point.y < cornerPixelY + gridSize) {
            foundCornerHover = corner;
            break;
          }
        }
        
        if (foundCornerHover) break;
      }
      
      setHoveredCorner(foundCornerHover);
    } else {
      setHoveredCorner(null);
    }

    // Check for edge dot hover
    // Only check hover when not dragging to avoid interference
    if (!canvasState.isDragging) {
      let targetRoomId = selectedRoomId;
      
      // If no room selected but edge is selected, check hover for the edge's room
      if (!targetRoomId && selectedEdgeId) {
        const selectedEdge = edges.find(e => e.id === selectedEdgeId);
        if (selectedEdge) {
          targetRoomId = selectedEdge.roomId;
        }
      }
      
      if (targetRoomId) {
        const room = rooms.find(r => r.id === targetRoomId);
        if (room) {
          // In template editing mode, only show hover for editing rooms
          if (isEditingTemplate && editingTemplateId && !room.id.startsWith('editing-')) {
            setHoveredDot(null);
          } else {
            const roomEdges = edges.filter(e => e.roomId === targetRoomId);
            const edgesBySide = new Map<string, Edge>();
            
            roomEdges.forEach(edge => {
              if (!edgesBySide.has(edge.side)) {
                edgesBySide.set(edge.side, edge);
              }
            });
            
            let foundHover = null;
            for (const [side, edge] of Array.from(edgesBySide.entries())) {
              const dotPosition = CanvasUtils.getEdgeDotPosition(room, side as any, gridSize);
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
      } else {
        setHoveredDot(null);
      }
    } else {
      setHoveredDot(null);
    }

    // Start dragging when mouse moves after mousedown in move or select mode
    if ((selectedTool === 'move' || selectedTool === 'select') && canvasState.dragStart && !canvasState.isDragging && (selectedRoomId || selectedInstanceId)) {
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
  }, [selectedTool, canvasState.dragStart, canvasState.isDragging, selectedRoomId, gridSize, true, rooms, edges]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey; // Ctrl/Cmd/Shift for multi-select

    // Check for origin dot drag (only during template editing mode)
    if (isEditingTemplate && templateOriginX !== undefined && templateOriginY !== undefined) {
      const originPixelX = templateOriginX * gridSize;
      const originPixelY = templateOriginY * gridSize;
      const distance = Math.sqrt(Math.pow(point.x - originPixelX, 2) + Math.pow(point.y - originPixelY, 2));
      
      if (distance <= 10) { // 10 pixel radius for click detection (larger than visual size for easier clicking)
        setCanvasState(prev => ({
          ...prev,
          isDraggingOrigin: true,
        }));
        return;
      }
    }

    // Check for corner click FIRST - regardless of selected tool
    // Check if this grid position corresponds to a corner (accounting for adjusted positions)
    let clickedCorner: {x: number, y: number} | null = null;
    
    for (const room of rooms) {
      // In template editing mode, only detect corners for editing rooms
      if (isEditingTemplate && editingTemplateId && !room.id.startsWith('editing-')) {
        continue;
      }
      
      const corners = [
        {x: room.x, y: room.y}, // top-left
        {x: room.x + room.width, y: room.y}, // top-right
        {x: room.x, y: room.y + room.height}, // bottom-left
        {x: room.x + room.width, y: room.y + room.height}, // bottom-right
      ];
      
      for (const corner of corners) {
        let detectionX = corner.x;
        let detectionY = corner.y;
        
        // Adjust detection coordinates to match where the preview appears
        // For right edge corners, check one cell left
        if (corner.x === room.x + room.width) {
          detectionX -= 1;
        }
        // For bottom edge corners, check one cell up  
        if (corner.y === room.y + room.height) {
          detectionY -= 1;
        }
        
        // Check if click position matches this corner's detection area
        if (gridPoint.x === detectionX && gridPoint.y === detectionY) {
          clickedCorner = corner; // Use original corner coordinates for the toggle
          break;
        }
      }
      
      if (clickedCorner) break;
    }
    
    if (clickedCorner) {
      onToggleCornerPriority(clickedCorner.x, clickedCorner.y);
      return; // Stop processing other events
    }

    switch (selectedTool) {
      case 'draw':
        // Prevent drawing when in template editing mode
        if (!isEditingTemplate) {
          setCanvasState(prev => ({
            ...prev,
            isDrawing: true,
            drawStart: point,
          }));
        }
        break;

      case 'move':
        // Check for component instance first
        const instanceToMove = getInstanceAt(gridPoint.x, gridPoint.y);
        if (instanceToMove) {
          onSelectInstance(instanceToMove.id);
          onSelectRoom(undefined);
          if (onSelectRoomIds) {
            onSelectRoomIds([]);
          }
          setCanvasState(prev => ({
            ...prev,
            isDragging: false, // Don't start dragging until mouse moves
            dragStart: gridPoint,
            dragStartOffset: {
              x: gridPoint.x - instanceToMove.x,
              y: gridPoint.y - instanceToMove.y
            }
          }));
        } else {
          const roomToMove = getRoomAt(gridPoint.x, gridPoint.y);
          if (roomToMove) {
            onSelectInstance(undefined);
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
        }
        break;

      case 'delete':
        // Prevent deletion during template editing mode
        if (isEditingTemplate) {
          break;
        }
        
        // Check for template instance first
        const instanceToDelete = getInstanceAt(gridPoint.x, gridPoint.y);
        if (instanceToDelete) {
          onDeleteInstance(instanceToDelete.id);
        } else {
          const roomToDelete = getRoomAt(gridPoint.x, gridPoint.y);
          if (roomToDelete) {
            onDeleteRoom(roomToDelete.id);
          }
        }
        break;

      case 'select':
        // Check for component instance first
        const instanceToSelect = getInstanceAt(gridPoint.x, gridPoint.y);
        if (instanceToSelect) {
          // Select the instance and clear any room selections
          onSelectInstance(instanceToSelect.id);
          onSelectRoom(undefined);
          if (onSelectRoomIds) {
            onSelectRoomIds([]);
          }
          // Set up for potential dragging
          setCanvasState(prev => ({
            ...prev,
            isDragging: false,
            dragStart: gridPoint,
            dragStartOffset: {
              x: gridPoint.x - instanceToSelect.x,
              y: gridPoint.y - instanceToSelect.y
            }
          }));
        } else {
          // No instance, check for rooms
          const roomToSelect = getRoomAt(gridPoint.x, gridPoint.y);
          if (roomToSelect) {
            // Clear instance selection when selecting a room
            onSelectInstance(undefined);
            
            if (isMultiSelect && onSelectRoomIds) {
              // Multi-select mode: toggle room in selection
              if (selectedRoomIds.includes(roomToSelect.id)) {
                // Remove from selection
                onSelectRoomIds(selectedRoomIds.filter(id => id !== roomToSelect.id));
              } else {
                // Add to selection
                onSelectRoomIds([...selectedRoomIds, roomToSelect.id]);
              }
            } else {
              // Single select mode
              onSelectRoom(roomToSelect.id);
              if (onSelectRoomIds) {
                onSelectRoomIds([roomToSelect.id]);
              }
            }
            
            // Set up for potential dragging (same as move tool)
            setCanvasState(prev => ({
              ...prev,
              isDragging: false,
              dragStart: gridPoint,
              dragStartOffset: {
                x: gridPoint.x - roomToSelect.x,
                y: gridPoint.y - roomToSelect.y
              }
            }));
          } else {
            // Clicking empty space clears all selections
            onSelectInstance(undefined);
            onSelectRoom(undefined);
            if (onSelectRoomIds) {
              onSelectRoomIds([]);
            }
          }
        }
        break;
    }
  }, [selectedTool, getRoomAt, getInstanceAt, onSelectRoom, onSelectRoomIds, onSelectInstance, onDeleteRoom, onToggleCornerPriority, gridSize, rooms, selectedRoomIds]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

    // Handle origin dragging stop
    if (canvasState.isDraggingOrigin) {
      setCanvasState(prev => ({
        ...prev,
        isDraggingOrigin: false,
      }));
      return;
    }

    if (canvasState.isDrawing && canvasState.drawStart) {
      // Prevent room creation when in template editing mode
      if (!isEditingTemplate) {
        const startGrid = CanvasUtils.getGridCoordinates(canvasState.drawStart, gridSize);
        const width = Math.max(1, Math.abs(gridPoint.x - startGrid.x));
        const height = Math.max(1, Math.abs(gridPoint.y - startGrid.y));
        const x = Math.min(startGrid.x, gridPoint.x);
        const y = Math.min(startGrid.y, gridPoint.y);
        
        onAddRoom(x, y, width, height);
      }
    }

    if (canvasState.isDragging && canvasState.dragStartOffset) {
      if (selectedInstanceId) {
        // Moving a component instance
        const instance = componentInstances.find(i => i.id === selectedInstanceId);
        const template = instance ? componentTemplates.find(t => t.id === instance.templateId) : undefined;
        
        if (instance && template) {
          const templateRooms = rooms.filter(r => template.roomIds.includes(r.id));
          
          if (templateRooms.length > 0) {
            const targetX = gridPoint.x - canvasState.dragStartOffset.x;
            const targetY = gridPoint.y - canvasState.dragStartOffset.y;
            
            // Apply basic grid constraints (no negative coordinates)
            let constrainedX = Math.max(0, targetX);
            let constrainedY = Math.max(0, targetY);
            
            // Calculate template origin
            const minX = Math.min(...templateRooms.map(r => r.x));
            const minY = Math.min(...templateRooms.map(r => r.y));
            
            // Create virtual rooms for all OTHER instances
            const otherInstanceRooms: Room[] = [];
            componentInstances.forEach(otherInstance => {
              if (otherInstance.id !== selectedInstanceId) {
                const otherTemplate = componentTemplates.find(t => t.id === otherInstance.templateId);
                if (otherTemplate) {
                  const otherTemplateRooms = rooms.filter(r => otherTemplate.roomIds.includes(r.id));
                  if (otherTemplateRooms.length > 0) {
                    const otherMinX = Math.min(...otherTemplateRooms.map(r => r.x));
                    const otherMinY = Math.min(...otherTemplateRooms.map(r => r.y));
                    
                    otherTemplateRooms.forEach(room => {
                      const offsetX = room.x - otherMinX;
                      const offsetY = room.y - otherMinY;
                      otherInstanceRooms.push({
                        ...room,
                        id: `virtual-${otherInstance.id}-${room.id}`,
                        x: otherInstance.x + offsetX,
                        y: otherInstance.y + offsetY,
                      });
                    });
                  }
                }
              }
            });
            
            // Get all regular rooms (not part of any template)
            const allTemplateRoomIds = new Set<string>();
            componentTemplates.forEach(t => t.roomIds.forEach(id => allTemplateRoomIds.add(id)));
            const regularRooms = rooms.filter(r => !allTemplateRoomIds.has(r.id));
            
            // Combine regular rooms and other instance rooms for collision detection
            const roomsToCheckAgainst = [...regularRooms, ...otherInstanceRooms];
            
            // Helper function to check if an instance position is valid
            const isInstancePositionValid = (x: number, y: number): boolean => {
              for (const templateRoom of templateRooms) {
                const offsetX = templateRoom.x - minX;
                const offsetY = templateRoom.y - minY;
                const movedRoom: Room = {
                  ...templateRoom,
                  x: x + offsetX,
                  y: y + offsetY,
                };
                if (!RoomValidation.isValidRoomPlacement(movedRoom, roomsToCheckAgainst)) {
                  return false;
                }
              }
              return true;
            };
            
            // Find nearest valid position (same logic as preview)
            if (!isInstancePositionValid(constrainedX, constrainedY)) {
              // Search in expanding grid for nearest valid position
              const searchRadius = 10;
              let found = false;
              let bestDistance = Infinity;
              let bestX = constrainedX;
              let bestY = constrainedY;
              
              for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                  const testX = constrainedX + dx;
                  const testY = constrainedY + dy;
                  
                  // Skip negative positions
                  if (testX < 0 || testY < 0) continue;
                  
                  if (isInstancePositionValid(testX, testY)) {
                    const distance = Math.abs(dx) + Math.abs(dy);
                    if (distance < bestDistance) {
                      bestDistance = distance;
                      bestX = testX;
                      bestY = testY;
                      found = true;
                    }
                  }
                }
              }
              
              // If found a valid position nearby, use it; otherwise stay at current position
              if (found) {
                constrainedX = bestX;
                constrainedY = bestY;
              } else {
                // No valid position found - don't move
                constrainedX = instance.x;
                constrainedY = instance.y;
              }
            }
            
            // Move to the validated position (matches preview)
            onMoveInstance(selectedInstanceId, constrainedX, constrainedY);
          }
        }
      } else if (selectedRoomId) {
        // Moving a room
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
    selectedInstanceId,
    rooms,
    componentInstances,
    onAddRoom,
    onMoveRoom,
    onMoveInstance,
    gridSize,
  ]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

    // Handle origin selection
    if (isSelectingOrigin) {
      onSelectOrigin(gridPoint.x, gridPoint.y);
      return;
    }

    // Check for edge dot click first
    // Allow edge dot clicks regardless of selected tool
    if (!canvasState.isDragging) {
      let targetRoomId = selectedRoomId;
      
      // If no room selected but edge is selected, allow clicks for the edge's room
      if (!targetRoomId && selectedEdgeId) {
        const selectedEdge = edges.find(e => e.id === selectedEdgeId);
        if (selectedEdge) {
          targetRoomId = selectedEdge.roomId;
        }
      }
      
      if (targetRoomId) {
        const room = rooms.find(r => r.id === targetRoomId);
        if (room) {
          // In template editing mode, only show dots for editing rooms
          if (isEditingTemplate && editingTemplateId && !room.id.startsWith('editing-')) {
            // Skip dot detection for non-editing rooms
          } else {
            const roomEdges = edges.filter(e => e.roomId === targetRoomId);
            const edgesBySide = new Map<string, Edge>();
            
            roomEdges.forEach(edge => {
              if (!edgesBySide.has(edge.side)) {
                edgesBySide.set(edge.side, edge);
              }
            });
            
            for (const [side, edge] of Array.from(edgesBySide.entries())) {
              const dotPosition = CanvasUtils.getEdgeDotPosition(room, side as any, gridSize);
              if (CanvasUtils.isPointNearEdgeDot(point, dotPosition, gridSize)) {
                onSelectEdge(edge.id);
                onSelectRoom(undefined); // Clear room selection when edge is selected
                return;
              }
            }
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
      // In template editing mode, only allow selection of temporary editing rooms
      if (isEditingTemplate && editingTemplateId) {
        if (room.id.startsWith('editing-')) {
          // This is a temporary editing room - allow selection
          onSelectRoom(room.id);
          onSelectEdge(undefined);
        } else {
          // This is not an editing room - ignore click
          return;
        }
      } else {
        // Normal mode - allow any room selection
        onSelectRoom(room.id);
        onSelectEdge(undefined);
      }
    } else {
      onSelectRoom(undefined);
      onSelectEdge(undefined);
    }
  }, [selectedTool, getRoomAt, getEdgeAt, onSelectRoom, onSelectEdge, onToggleCornerPriority, gridSize, selectedRoomId, selectedEdgeId, rooms, edges]);

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

  const handleDragOver = useCallback((event: React.DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    
    // During dragover, we can't access getData, so we check types
    if (event.dataTransfer.types.includes('templateid')) {
      setDraggedTemplateId('temp');
      setDragPreviewPos(gridPoint);
    }
  }, [gridSize]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const templateId = event.dataTransfer.getData('templateId');
    if (!templateId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    
    onPlaceInstance(templateId, gridPoint.x, gridPoint.y);
    
    setDraggedTemplateId(null);
    setDragPreviewPos(null);
  }, [gridSize, onPlaceInstance]);

  const handleDragLeave = useCallback(() => {
    setDraggedTemplateId(null);
    setDragPreviewPos(null);
  }, []);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Only handle double-click on instances in "all-instances-are-templates" mode
    if (creationMode !== 'all-instances-are-templates') return;
    
    // Prevent double-clicks when already in template editing mode
    if (isEditingTemplate) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

    const instance = getInstanceAt(gridPoint.x, gridPoint.y);
    if (instance) {
      onEnterTemplateEditMode(instance.templateId, instance.id);
    }
  }, [creationMode, isEditingTemplate, gridSize, getInstanceAt, onEnterTemplateEditMode]);

  return (
    <div className="relative w-full h-full bg-canvas-background">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className={`border border-border outline-none ${
          selectedTool === 'draw' ? 'cursor-crosshair' :
          selectedTool === 'move' ? 'cursor-grab' :
          hoveredDot ? 'cursor-pointer' :
          draggedTemplateId ? 'cursor-copy' :
          'cursor-default'
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      />
      
      {/* Grid Scale Indicator */}
      <div className="absolute bottom-2 left-2 bg-card px-3 py-1.5 rounded-sm text-xs text-muted-foreground border border-border shadow-sm">
        Grid: 1 square = 1 ft
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-2 left-2 flex flex-col space-y-1">
        <button className="bg-card hover:bg-muted p-2 rounded-sm border border-border shadow-sm transition-colors">
          <i className="fas fa-plus text-xs text-muted-foreground"></i>
        </button>
        <button className="bg-card hover:bg-muted p-2 rounded-sm border border-border shadow-sm transition-colors">
          <i className="fas fa-minus text-xs text-muted-foreground"></i>
        </button>
        <button className="bg-card hover:bg-muted p-2 rounded-sm border border-border shadow-sm transition-colors">
          <i className="fas fa-home text-xs text-muted-foreground"></i>
        </button>
      </div>
    </div>
  );
}
