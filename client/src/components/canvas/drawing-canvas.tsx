import { useRef, useEffect, useCallback, useState } from 'react';
import { CanvasUtils } from '@/lib/canvas-utils';
import { Room, Edge, ComponentTemplate, ComponentInstance, isRoomVisible } from '@shared/schema';
import { Point, CanvasState } from '@/types/room';
import { RoomValidation } from '@/lib/room-validation';
import { CreationMode } from '@/hooks/use-units-editor';

interface DrawingCanvasProps {
  rooms: Room[];
  edges: Edge[];
  selectedTool: 'draw' | 'move' | 'delete' | 'select';
  selectedColor: string;
  selectedRoomId?: string;
  selectedEdgeId?: string;
  selectedRoomIds?: string[];
  selectedInstanceId?: string;
  selectedTemplateId?: string;
  showGrid: boolean;
  cornerPriorities: Record<string, 'horizontal' | 'vertical'>;
  componentTemplates: ComponentTemplate[];
  componentInstances: ComponentInstance[];
  creationMode: CreationMode;
  isEditingTemplate: boolean;
  editingTemplateId?: string;
  editingInstanceId?: string;
  isSelectingOrigin: boolean;
  templateOriginX?: number;
  templateOriginY?: number;
  newRoomsInEdit: string[];
  draggedTemplateId: string | null;
  onAddRoom: (x: number, y: number, width: number, height: number) => void;
  onMoveRoom: (roomId: string, x: number, y: number) => void;
  onDeleteRoom: (roomId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onSelectRoom: (roomId: string | undefined) => void;
  onSelectEdge: (edgeId: string | undefined) => void;
  onSelectRoomIds?: (roomIds: string[]) => void;
  onSelectInstance: (instanceId: string | undefined) => void;
  onSelectTemplate: (templateId: string | undefined) => void;
  onMoveInstance: (instanceId: string, x: number, y: number) => void;
  onMoveTemplate: (templateId: string, deltaX: number, deltaY: number) => void;
  onToggleCornerPriority: (x: number, y: number) => void;
  onPlaceInstance: (templateId: string, x: number, y: number) => void;
  onEnterTemplateEditMode: (templateId: string, instanceId?: string) => void;
  onSelectOrigin: (x: number, y: number) => void;
  onSetTemplateOrigin: (x: number, y: number) => void;
  onUpdateTemplateOrigin: (templateId: string, x: number, y: number) => void;
  getEdgeColor: (edge: Edge) => string;
  getRoomAt: (x: number, y: number) => Room | undefined;
  getEdgeAt: (x: number, y: number) => Edge | undefined;
  getInstanceAt: (x: number, y: number) => ComponentInstance | undefined;
  getTemplateAt: (x: number, y: number) => ComponentTemplate | undefined;
  onDeselectOption?: () => void;
  activeOptionState: Record<string, string>;
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
  selectedTemplateId,
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
  newRoomsInEdit,
  draggedTemplateId,
  onAddRoom,
  onMoveRoom,
  onDeleteRoom,
  onDeleteInstance,
  onSelectRoom,
  onSelectEdge,
  onSelectRoomIds,
  onSelectInstance,
  onSelectTemplate,
  onMoveInstance,
  onMoveTemplate,
  onToggleCornerPriority,
  onPlaceInstance,
  onEnterTemplateEditMode,
  onSelectOrigin,
  onSetTemplateOrigin,
  onUpdateTemplateOrigin,
  getEdgeColor,
  getRoomAt,
  getEdgeAt,
  getInstanceAt,
  getTemplateAt,
  onDeselectOption,
  activeOptionState,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const justFinishedDrawingRef = useRef<boolean>(false);
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
  const [dragPreviewPos, setDragPreviewPos] = useState<Point | null>(null);
  
  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<Point | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<Point | null>(null);
  
  // Origin dragging state
  const [draggedOriginTemplateId, setDraggedOriginTemplateId] = useState<string | null>(null);
  const [hoveredOriginTemplateId, setHoveredOriginTemplateId] = useState<string | null>(null);

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
      
      // Skip edges for rooms that don't meet visibility conditions
      const room = rooms.find(r => r.id === edge.roomId);
      if (room && !isRoomVisible(room, activeOptionState)) {
        return;
      }
      
      // In template editing mode, handle edges differently
      if (isEditingTemplate && editingTemplateId) {
        if (edge.roomId.startsWith('editing-') || newRoomsInEdit.includes(edge.roomId)) {
          // This is a temporary editing room edge or a new room created during editing - show normally
          const color = getEdgeColor(edge);
          CanvasUtils.drawEdge(ctx, edge, gridSize, color, cornerPriorities, rooms);
        } else {
          // Check if this edge belongs to the original template being edited
          const template = componentTemplates.find(t => t.id === editingTemplateId);
          if (template && template.roomIds.includes(edge.roomId)) {
            // In "template-is-first-instance" mode, we edit the template rooms directly
            // Check if there are any temporary editing rooms - if not, show the original rooms
            const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
            if (hasEditingRooms) {
              // There are temporary editing rooms, so hide the original template rooms
              return;
            } else {
              // No temporary editing rooms - we're editing the originals directly, so show them normally
              const color = getEdgeColor(edge);
              CanvasUtils.drawEdge(ctx, edge, gridSize, color, cornerPriorities, rooms);
              return;
            }
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
      
      // In "template-always-live" mode, template rooms are always visible and editable
      // No special handling needed - show them normally
      
      // Normal mode - show all edges
      const color = getEdgeColor(edge);
      CanvasUtils.drawEdge(ctx, edge, gridSize, color, cornerPriorities, rooms);
    });

    // In "template-is-first-instance" mode, draw blue outline around templates (when not editing)
    if (creationMode === 'template-is-first-instance' && !isEditingTemplate) {
      componentTemplates.forEach(template => {
        const templateRooms = rooms.filter(r => 
          template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState)
        );
        
        if (templateRooms.length > 0) {
          // Build a set of all occupied grid cells for this template
          const occupiedCells = new Set<string>();
          templateRooms.forEach(room => {
            for (let x = room.x; x < room.x + room.width; x++) {
              for (let y = room.y; y < room.y + room.height; y++) {
                occupiedCells.add(`${x},${y}`);
              }
            }
          });
          
          // Find all external edges by checking each cell's borders
          const externalEdges: { x1: number, y1: number, x2: number, y2: number }[] = [];
          
          templateRooms.forEach(room => {
            for (let x = room.x; x < room.x + room.width; x++) {
              for (let y = room.y; y < room.y + room.height; y++) {
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
          
          // Draw the perimeter with thin solid magenta line
          ctx.strokeStyle = '#d946ef'; // fuchsia-500 (magenta/purple)
          ctx.lineWidth = 2;
          ctx.setLineDash([]); // solid line
          
          externalEdges.forEach(edge => {
            ctx.beginPath();
            ctx.moveTo(edge.x1 * gridSize, edge.y1 * gridSize);
            ctx.lineTo(edge.x2 * gridSize, edge.y2 * gridSize);
            ctx.stroke();
          });
        }
      });
    }

    // Draw component instances
    componentInstances.forEach(instance => {
      const template = componentTemplates.find(t => t.id === instance.templateId);
      if (template) {
        const templateRooms = rooms.filter(r => 
          template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState, instance.id)
        );
        if (templateRooms.length > 0) {
          // In edit mode, grey out ALL instances heavily with no color
          if (isEditingTemplate) {
            ctx.globalAlpha = 0.08;
          }
          
          // Use template origin as reference point (not bounding box)
          // If origin is not set, fall back to bounding box for backward compatibility
          const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
          const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
          
          // Calculate bounding box for selection and overlay purposes
          const minX = Math.min(...templateRooms.map(r => r.x));
          const minY = Math.min(...templateRooms.map(r => r.y));
          const maxX = Math.max(...templateRooms.map(r => r.x + r.width));
          const maxY = Math.max(...templateRooms.map(r => r.y + r.height));
          
          // Draw room edges with colors at the instance position (same as originals)
          templateRooms.forEach(room => {
            // Calculate offset from origin (not bounding box)
            const offsetX = room.x - originX;
            const offsetY = room.y - originY;
            
            // Get edges for this room and draw them at instance position
            const roomEdges = edges.filter(e => e.roomId === room.id);
            roomEdges.forEach(edge => {
              // In edit mode, use grey color for instances
              const color = isEditingTemplate ? '#9CA3AF' : getEdgeColor(edge);
              // Create a translated edge at the instance position
              // Position relative to instance position + offset from origin
              const instanceEdge = {
                ...edge,
                x1: edge.x1 - originX + instance.x,
                y1: edge.y1 - originY + instance.y,
                x2: edge.x2 - originX + instance.x,
                y2: edge.y2 - originY + instance.y,
              };
              CanvasUtils.drawEdge(ctx, instanceEdge, gridSize, color, cornerPriorities, rooms);
            });
          });
          
          // Draw a single 75% transparent blue overlay over the combined shape
          ctx.save();
          
          // First, create a clipping region from all rooms (this prevents overlapping fills)
          ctx.beginPath();
          templateRooms.forEach(room => {
            const offsetX = room.x - originX;
            const offsetY = room.y - originY;
            const instanceX = (instance.x + offsetX) * gridSize;
            const instanceY = (instance.y + offsetY) * gridSize;
            const width = room.width * gridSize;
            const height = room.height * gridSize;
            ctx.rect(instanceX, instanceY, width, height);
          });
          ctx.clip();
          
          // Calculate bounding box to fill the entire clipped region at once
          const minInstanceX = Math.min(...templateRooms.map(r => (instance.x + (r.x - originX)) * gridSize));
          const minInstanceY = Math.min(...templateRooms.map(r => (instance.y + (r.y - originY)) * gridSize));
          const maxInstanceX = Math.max(...templateRooms.map(r => (instance.x + (r.x - originX) + r.width) * gridSize));
          const maxInstanceY = Math.max(...templateRooms.map(r => (instance.y + (r.y - originY) + r.height) * gridSize));
          
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
              const offsetX = room.x - originX;
              const offsetY = room.y - originY;
              for (let x = instance.x + offsetX; x < instance.x + offsetX + room.width; x++) {
                for (let y = instance.y + offsetY; y < instance.y + offsetY + room.height; y++) {
                  occupiedCells.add(`${x},${y}`);
                }
              }
            });
            
            // Find all external edges by checking each cell's borders
            const externalEdges: { x1: number, y1: number, x2: number, y2: number }[] = [];
            
            templateRooms.forEach(room => {
              const offsetX = room.x - originX;
              const offsetY = room.y - originY;
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
        const targetX = Math.max(0, currentGridPos.x - canvasState.dragStartOffset.x);
        const targetY = Math.max(0, currentGridPos.y - canvasState.dragStartOffset.y);
        
        // No collision detection - rooms can overlap freely
        const previewRoom = {
          ...room,
          x: targetX,
          y: targetY,
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
          
          // No collision detection - rooms can overlap freely
          roomX = Math.max(0, targetX);
          roomY = Math.max(0, targetY);
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
        const templateRooms = rooms.filter(r => 
          template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState, instance.id)
        );
        if (templateRooms.length > 0) {
          // Use template origin as reference point
          const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
          const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
          
          // Calculate preview position
          const currentGridPos = CanvasUtils.getGridCoordinates(mousePos, gridSize);
          const previewX = currentGridPos.x - canvasState.dragStartOffset.x;
          const previewY = currentGridPos.y - canvasState.dragStartOffset.y;
          
          // No collision detection - instances can overlap freely
          const bestX = Math.max(0, previewX);
          const bestY = Math.max(0, previewY);
          
          // Draw blue dashed border preview around outer perimeter only at validated position
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          
          // Build a set of all occupied grid cells for the preview position
          const previewOccupiedCells = new Set<string>();
          templateRooms.forEach(room => {
            const offsetX = room.x - originX;
            const offsetY = room.y - originY;
            for (let x = bestX + offsetX; x < bestX + offsetX + room.width; x++) {
              for (let y = bestY + offsetY; y < bestY + offsetY + room.height; y++) {
                previewOccupiedCells.add(`${x},${y}`);
              }
            }
          });
          
          // Find all external edges for the preview
          const previewExternalEdges: { x1: number, y1: number, x2: number, y2: number }[] = [];
          
          templateRooms.forEach(room => {
            const offsetX = room.x - originX;
            const offsetY = room.y - originY;
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

    // Show drag preview for selected template (in template-is-first-instance mode)
    if (selectedTemplateId && canvasState.isDragging && canvasState.dragStart && mousePos && creationMode === 'template-is-first-instance') {
      const template = componentTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        const templateRooms = rooms.filter(r => 
          template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState)
        );
        if (templateRooms.length > 0) {
          // Calculate delta from drag start
          const currentGridPos = CanvasUtils.getGridCoordinates(mousePos, gridSize);
          const deltaX = currentGridPos.x - canvasState.dragStart.x;
          const deltaY = currentGridPos.y - canvasState.dragStart.y;
          
          // Draw preview of template at new position
          ctx.save();
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          
          // Draw each room's outline at the new position
          templateRooms.forEach(room => {
            const previewX = (room.x + deltaX) * gridSize;
            const previewY = (room.y + deltaY) * gridSize;
            const width = room.width * gridSize;
            const height = room.height * gridSize;
            
            ctx.strokeRect(previewX, previewY, width, height);
          });
          
          ctx.setLineDash([]);
          ctx.restore();
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
        // In template editing mode, only consider editing rooms (if they exist)
        if (isEditingTemplate && editingTemplateId) {
          const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
          const isEditingRoom = room.id.startsWith('editing-') || newRoomsInEdit.includes(room.id);
          const template = componentTemplates.find(t => t.id === editingTemplateId);
          const isTemplateRoom = template && template.roomIds.includes(room.id);
          
          // If we have editing rooms, only consider those and new rooms; otherwise consider template rooms and new rooms
          if (hasEditingRooms && !isEditingRoom) {
            return false;
          } else if (!hasEditingRooms && !isTemplateRoom && !newRoomsInEdit.includes(room.id)) {
            return false;
          }
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
      
      // No collision detection - draw preview at target position
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        x * gridSize, 
        y * gridSize, 
        width * gridSize, 
        height * gridSize
      );
      ctx.setLineDash([]);
    }

    // Draw template instance preview when dragging
    if (draggedTemplateId && dragPreviewPos) {
      const template = componentTemplates.find(t => t.id === draggedTemplateId);
      if (template) {
        const templateRooms = rooms.filter(r => 
          template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState)
        );
        if (templateRooms.length > 0) {
          // Use template origin as reference point
          const originX = template.originX ?? Math.min(...templateRooms.map(r => r.x));
          const originY = template.originY ?? Math.min(...templateRooms.map(r => r.y));
          
          ctx.save();
          ctx.globalAlpha = 0.5; // Make the entire preview semi-transparent
          
          // Draw edges (walls) for each room in the preview
          templateRooms.forEach(room => {
            const offsetX = room.x - originX;
            const offsetY = room.y - originY;
            
            // Get edges for this room
            const roomEdges = edges.filter(e => e.roomId === room.id);
            roomEdges.forEach(edge => {
              const color = getEdgeColor(edge);
              // Create a translated edge at the preview position
              const previewEdge = {
                ...edge,
                x1: edge.x1 - originX + dragPreviewPos.x,
                y1: edge.y1 - originY + dragPreviewPos.y,
                x2: edge.x2 - originX + dragPreviewPos.x,
                y2: edge.y2 - originY + dragPreviewPos.y,
              };
              CanvasUtils.drawEdge(ctx, previewEdge, gridSize, color, cornerPriorities, rooms);
            });
          });
          
          // Draw the semi-transparent overlay fill
          ctx.globalAlpha = 0.15;
          
          // Create clipping region from all preview rooms
          ctx.beginPath();
          templateRooms.forEach(room => {
            const offsetX = room.x - originX;
            const offsetY = room.y - originY;
            const previewX = (dragPreviewPos.x + offsetX) * gridSize;
            const previewY = (dragPreviewPos.y + offsetY) * gridSize;
            const width = room.width * gridSize;
            const height = room.height * gridSize;
            ctx.rect(previewX, previewY, width, height);
          });
          ctx.clip();
          
          // Calculate bounding box to fill
          const minPreviewX = Math.min(...templateRooms.map(r => (dragPreviewPos.x + (r.x - originX)) * gridSize));
          const minPreviewY = Math.min(...templateRooms.map(r => (dragPreviewPos.y + (r.y - originY)) * gridSize));
          const maxPreviewX = Math.max(...templateRooms.map(r => (dragPreviewPos.x + (r.x - originX) + r.width) * gridSize));
          const maxPreviewY = Math.max(...templateRooms.map(r => (dragPreviewPos.y + (r.y - originY) + r.height) * gridSize));
          
          // Fill the entire preview region with light grey
          ctx.fillStyle = '#D1D5DB';
          ctx.fillRect(minPreviewX, minPreviewY, maxPreviewX - minPreviewX, maxPreviewY - minPreviewY);
          
          ctx.restore();
        }
      }
    }

    // Draw template origin points
    // Show origin points on templates (not instances) based on creation mode
    
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
    
    // Show origin points on actual template rooms (not on instances)
    if (!isSelectingOrigin && !isEditingTemplate) {
      componentTemplates.forEach(template => {
        if (template.originX !== undefined && template.originY !== undefined) {
          // Only show origin on the actual template rooms when they are visible
          const templateRooms = rooms.filter(r => 
            template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState)
          );
          
          // Only show origin if template rooms are actually visible (not in "all-instances-are-templates" mode)
          const shouldShowOrigin = creationMode !== 'all-instances-are-templates' && templateRooms.length > 0;
          
          if (shouldShowOrigin) {
            const isHovered = hoveredOriginTemplateId === template.id;
            const isDragging = draggedOriginTemplateId === template.id;
            
            ctx.save();
            
            // Draw larger circle when hovered or being dragged
            const radius = (isHovered || isDragging) ? 10 : 8;
            
            // Draw red circle for origin point
            ctx.beginPath();
            ctx.arc(template.originX * gridSize, template.originY * gridSize, radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#EF4444'; // Red color
            ctx.fill();
            ctx.strokeStyle = isDragging ? '#991B1B' : '#DC2626'; // Darker border when dragging
            ctx.lineWidth = isDragging ? 3 : 2;
            ctx.stroke();
            
            // Draw white dot in center
            ctx.beginPath();
            ctx.arc(template.originX * gridSize, template.originY * gridSize, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            
            ctx.restore();
          }
        }
      });
    }

    // Draw dragged origin point preview
    if (draggedOriginTemplateId && mousePos) {
      const intersectionPoint = CanvasUtils.getGridIntersectionCoordinates(mousePos, gridSize);
      ctx.save();
      
      // Draw preview origin point at snapped position
      ctx.beginPath();
      ctx.arc(intersectionPoint.x * gridSize, intersectionPoint.y * gridSize, 10, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; // Semi-transparent red
      ctx.fill();
      ctx.strokeStyle = '#991B1B';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw white dot in center
      ctx.beginPath();
      ctx.arc(intersectionPoint.x * gridSize, intersectionPoint.y * gridSize, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      
      ctx.restore();
    }

    // Draw marquee selection rectangle
    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      ctx.save();
      
      const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
      const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
      const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
      const y2 = Math.max(marqueeStart.y, marqueeEnd.y);
      
      // Draw semi-transparent blue fill
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      
      // Draw blue dashed border
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.setLineDash([]);
      
      ctx.restore();
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
    editingTemplateId,
    isSelectingOrigin,
    templateOriginX,
    templateOriginY,
    newRoomsInEdit,
    isMarqueeSelecting,
    marqueeStart,
    marqueeEnd,
    hoveredOriginTemplateId,
    draggedOriginTemplateId,
    activeOptionState,
  ]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    setMousePos(point);

    // Handle origin dragging - snap to grid line intersections
    if (canvasState.isDraggingOrigin) {
      const intersectionPoint = CanvasUtils.getGridIntersectionCoordinates(point, gridSize);
      onSetTemplateOrigin(intersectionPoint.x, intersectionPoint.y);
      return;
    }
    
    // Handle dragging template origin points
    if (draggedOriginTemplateId) {
      const intersectionPoint = CanvasUtils.getGridIntersectionCoordinates(point, gridSize);
      const template = componentTemplates.find(t => t.id === draggedOriginTemplateId);
      if (template) {
        // Update the template's origin temporarily during drag
        // This will be saved on mouse up
        setMousePos(point);
      }
      return;
    }

    // Update marquee selection rectangle
    if (isMarqueeSelecting) {
      setMarqueeEnd(point);
      return;
    }
    
    // Check for origin point hover when not dragging anything
    if (!canvasState.isDragging && !isMarqueeSelecting && !draggedOriginTemplateId) {
      let foundHoveredOrigin: string | null = null;
      
      // Check template origin points
      if (!isSelectingOrigin && !isEditingTemplate && creationMode !== 'all-instances-are-templates') {
        for (const template of componentTemplates) {
          if (template.originX !== undefined && template.originY !== undefined) {
            const templateRooms = rooms.filter(r => 
              template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState)
            );
            if (templateRooms.length > 0) {
              const originPixelX = template.originX * gridSize;
              const originPixelY = template.originY * gridSize;
              const distance = Math.sqrt(Math.pow(point.x - originPixelX, 2) + Math.pow(point.y - originPixelY, 2));
              
              if (distance <= 12) { // Slightly larger hover detection radius
                foundHoveredOrigin = template.id;
                break;
              }
            }
          }
        }
      }
      
      setHoveredOriginTemplateId(foundHoveredOrigin);
    } else {
      setHoveredOriginTemplateId(null);
    }

    // Check for corner hover
    // Only check hover when not dragging to avoid interference
    if (!canvasState.isDragging) {
      // Check for corner hover first
      let foundCornerHover: {x: number, y: number} | null = null;
      
      for (const room of rooms) {
        // In template editing mode, only detect corners for editing rooms (if they exist)
        if (isEditingTemplate && editingTemplateId) {
          const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
          const isEditingRoom = room.id.startsWith('editing-') || newRoomsInEdit.includes(room.id);
          const template = componentTemplates.find(t => t.id === editingTemplateId);
          const isTemplateRoom = template && template.roomIds.includes(room.id);
          
          // If we have editing rooms, only consider those and new rooms; otherwise consider template rooms and new rooms
          if (hasEditingRooms && !isEditingRoom) {
            continue;
          } else if (!hasEditingRooms && !isTemplateRoom && !newRoomsInEdit.includes(room.id)) {
            continue;
          }
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
          // In template editing mode, only show hover for editing rooms (if they exist)
          if (isEditingTemplate && editingTemplateId) {
            const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
            const isEditingRoom = room.id.startsWith('editing-') || newRoomsInEdit.includes(room.id);
            const template = componentTemplates.find(t => t.id === editingTemplateId);
            const isTemplateRoom = template && template.roomIds.includes(room.id);
            const isNewRoom = newRoomsInEdit.includes(room.id);
            
            // If we have editing rooms, only show hover for those and new rooms; otherwise for template rooms and new rooms
            if ((hasEditingRooms && !isEditingRoom) || (!hasEditingRooms && !isTemplateRoom && !isNewRoom)) {
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
    if ((selectedTool === 'move' || selectedTool === 'select') && canvasState.dragStart && !canvasState.isDragging && (selectedRoomId || selectedInstanceId || selectedTemplateId)) {
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
  }, [selectedTool, canvasState.dragStart, canvasState.isDragging, canvasState.isDraggingOrigin, selectedRoomId, selectedInstanceId, selectedTemplateId, selectedEdgeId, gridSize, isEditingTemplate, editingTemplateId, isMarqueeSelecting, rooms, edges, componentTemplates, componentInstances, onSetTemplateOrigin, isSelectingOrigin, creationMode, activeOptionState, draggedOriginTemplateId]);

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
    
    // Check for template origin point drag (when not in editing mode)
    if (!isEditingTemplate && !isSelectingOrigin && creationMode !== 'all-instances-are-templates') {
      // Check if clicking on any template origin point
      for (const template of componentTemplates) {
        if (template.originX !== undefined && template.originY !== undefined) {
          const templateRooms = rooms.filter(r => 
            template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState)
          );
          if (templateRooms.length > 0) {
            const originPixelX = template.originX * gridSize;
            const originPixelY = template.originY * gridSize;
            const distance = Math.sqrt(Math.pow(point.x - originPixelX, 2) + Math.pow(point.y - originPixelY, 2));
            
            if (distance <= 12) { // 12 pixel radius for click detection
              setDraggedOriginTemplateId(template.id);
              return;
            }
          }
        }
      }
    }

    // Check for corner click FIRST - regardless of selected tool
    // Check if this grid position corresponds to a corner (accounting for adjusted positions)
    let clickedCorner: {x: number, y: number} | null = null;
    
    for (const room of rooms) {
      // In template editing mode, only detect corners for editing rooms (if they exist)
      if (isEditingTemplate && editingTemplateId) {
        const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
        const isEditingRoom = room.id.startsWith('editing-') || newRoomsInEdit.includes(room.id);
        const template = componentTemplates.find(t => t.id === editingTemplateId);
        const isTemplateRoom = template && template.roomIds.includes(room.id);
        
        // If we have editing rooms, only consider those and new rooms; otherwise consider template rooms and new rooms
        if (hasEditingRooms && !isEditingRoom) {
          continue;
        } else if (!hasEditingRooms && !isTemplateRoom && !newRoomsInEdit.includes(room.id)) {
          continue;
        }
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
        // Allow drawing in all modes, including template editing mode
        setCanvasState(prev => ({
          ...prev,
          isDrawing: true,
          drawStart: point,
        }));
        break;

      case 'move':
        // Check for component instance first
        const instanceToMove = getInstanceAt(gridPoint.x, gridPoint.y);
        if (instanceToMove) {
          onSelectInstance(instanceToMove.id);
          onSelectRoom(undefined);
          onSelectTemplate(undefined);
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
          // Check for template (in template-is-first-instance mode)
          const templateToMove = getTemplateAt(gridPoint.x, gridPoint.y);
          if (templateToMove) {
            onSelectTemplate(templateToMove.id);
            onSelectInstance(undefined);
            onSelectRoom(undefined);
            if (onSelectRoomIds) {
              onSelectRoomIds([]);
            }
            setCanvasState(prev => ({
              ...prev,
              isDragging: false,
              dragStart: gridPoint,
            }));
          } else {
            const roomToMove = getRoomAt(gridPoint.x, gridPoint.y);
            if (roomToMove) {
              // In "template-is-first-instance" mode, check if room belongs to a template
              if (creationMode === 'template-is-first-instance' && !isEditingTemplate) {
                const template = componentTemplates.find(t => t.roomIds.includes(roomToMove.id));
                if (template) {
                  // Select the template instead to allow template movement
                  onSelectTemplate(template.id);
                  onSelectInstance(undefined);
                  onSelectRoom(undefined);
                  if (onSelectRoomIds) {
                    onSelectRoomIds([]);
                  }
                  setCanvasState(prev => ({
                    ...prev,
                    isDragging: false,
                    dragStart: gridPoint,
                  }));
                  break;
                }
              }
              
              // In "template-always-live" mode, template rooms are always movable
              
              onSelectInstance(undefined);
              onSelectTemplate(undefined);
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
          onSelectTemplate(undefined);
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
          // Check for template (in template-is-first-instance mode)
          const templateToSelect = getTemplateAt(gridPoint.x, gridPoint.y);
          if (templateToSelect) {
            // Select the template and clear other selections
            onSelectTemplate(templateToSelect.id);
            onSelectInstance(undefined);
            onSelectRoom(undefined);
            if (onSelectRoomIds) {
              onSelectRoomIds([]);
            }
            setCanvasState(prev => ({
              ...prev,
              isDragging: false,
              dragStart: gridPoint,
            }));
          } else {
            // No instance or template, check for rooms
            const roomToSelect = getRoomAt(gridPoint.x, gridPoint.y);
            if (roomToSelect) {
              // In "template-is-first-instance" mode, check if room belongs to a template
              if (creationMode === 'template-is-first-instance' && !isEditingTemplate) {
                const template = componentTemplates.find(t => t.roomIds.includes(roomToSelect.id));
                if (template) {
                  // Select the template instead of the room
                  onSelectTemplate(template.id);
                  onSelectInstance(undefined);
                  onSelectRoom(undefined);
                  if (onSelectRoomIds) {
                    onSelectRoomIds([]);
                  }
                  setCanvasState(prev => ({
                    ...prev,
                    isDragging: false,
                    dragStart: gridPoint,
                  }));
                  break;
                }
              }
              
              // In "template-always-live" mode, template rooms are always selectable
              
              // Clear instance and template selection when selecting a room
              onSelectInstance(undefined);
              onSelectTemplate(undefined);
              
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
              // Clicking empty space starts marquee selection
            if (!isMultiSelect) {
              // Clear selections first if not multi-selecting
              onSelectInstance(undefined);
              onSelectRoom(undefined);
              if (onSelectRoomIds) {
                onSelectRoomIds([]);
              }
            }
            
            // Start marquee selection
            setIsMarqueeSelecting(true);
            setMarqueeStart(point);
            setMarqueeEnd(point);
            }
          }
        }
        break;
    }
  }, [selectedTool, getRoomAt, getInstanceAt, onSelectRoom, onSelectRoomIds, onSelectInstance, onDeleteRoom, onDeleteInstance, onToggleCornerPriority, gridSize, rooms, selectedRoomIds, isEditingTemplate, editingTemplateId, isSelectingOrigin, creationMode, componentTemplates, templateOriginX, templateOriginY, activeOptionState, onSetTemplateOrigin]);

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
    
    // Handle template origin dragging stop
    if (draggedOriginTemplateId) {
      const intersectionPoint = CanvasUtils.getGridIntersectionCoordinates(point, gridSize);
      onUpdateTemplateOrigin(draggedOriginTemplateId, intersectionPoint.x, intersectionPoint.y);
      setDraggedOriginTemplateId(null);
      return;
    }

    if (canvasState.isDrawing && canvasState.drawStart) {
      // Allow room creation in all modes, including template editing mode
      const startGrid = CanvasUtils.getGridCoordinates(canvasState.drawStart, gridSize);
      const width = Math.max(1, Math.abs(gridPoint.x - startGrid.x));
      const height = Math.max(1, Math.abs(gridPoint.y - startGrid.y));
      const x = Math.min(startGrid.x, gridPoint.x);
      const y = Math.min(startGrid.y, gridPoint.y);
      
      onAddRoom(x, y, width, height);
      
      // Set flag to prevent the subsequent click event from changing the selection
      justFinishedDrawingRef.current = true;
    }

    // Handle template dragging (only uses dragStart, not dragStartOffset)
    if (canvasState.isDragging && selectedTemplateId && canvasState.dragStart) {
      // Moving a template (all rooms together)
      const deltaX = gridPoint.x - canvasState.dragStart.x;
      const deltaY = gridPoint.y - canvasState.dragStart.y;
      
      if (deltaX !== 0 || deltaY !== 0) {
        onMoveTemplate(selectedTemplateId, deltaX, deltaY);
      }
    }

    if (canvasState.isDragging && canvasState.dragStartOffset) {
      if (selectedInstanceId) {
        // Moving a component instance
        const instance = componentInstances.find(i => i.id === selectedInstanceId);
        const template = instance ? componentTemplates.find(t => t.id === instance.templateId) : undefined;
        
        if (instance && template) {
          const templateRooms = rooms.filter(r => 
            template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState, instance.id)
          );
          
          if (templateRooms.length > 0) {
            const targetX = gridPoint.x - canvasState.dragStartOffset.x;
            const targetY = gridPoint.y - canvasState.dragStartOffset.y;
            
            // No collision detection - instances can overlap freely
            const constrainedX = Math.max(0, targetX);
            const constrainedY = Math.max(0, targetY);
            
            onMoveInstance(selectedInstanceId, constrainedX, constrainedY);
          }
        }
      } else if (selectedRoomId) {
        // Moving a room
        const room = rooms.find(r => r.id === selectedRoomId);
        if (room) {
          const targetX = gridPoint.x - canvasState.dragStartOffset.x;
          const targetY = gridPoint.y - canvasState.dragStartOffset.y;
          
          // No collision detection - rooms can overlap freely
          const finalX = Math.max(0, targetX);
          const finalY = Math.max(0, targetY);
          
          onMoveRoom(selectedRoomId, finalX, finalY);
        }
      }
    }

    // Handle marquee selection completion
    if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
      const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
      const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
      const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
      const y2 = Math.max(marqueeStart.y, marqueeEnd.y);
      
      const selectedRoomIdsFromMarquee: string[] = [];
      const selectedInstanceIdsFromMarquee: string[] = [];
      
      // Check which rooms intersect with marquee
      rooms.forEach(room => {
        // Skip template rooms in all-instances-are-templates mode
        const isTemplateRoom = componentTemplates.some(t => t.roomIds.includes(room.id));
        if (creationMode === 'all-instances-are-templates' && isTemplateRoom) {
          return;
        }
        
        const roomX1 = room.x * gridSize;
        const roomY1 = room.y * gridSize;
        const roomX2 = (room.x + room.width) * gridSize;
        const roomY2 = (room.y + room.height) * gridSize;
        
        // Check if room intersects with marquee
        if (!(roomX2 < x1 || roomX1 > x2 || roomY2 < y1 || roomY1 > y2)) {
          selectedRoomIdsFromMarquee.push(room.id);
        }
      });
      
      // Check which instances intersect with marquee
      componentInstances.forEach(instance => {
        const template = componentTemplates.find(t => t.id === instance.templateId);
        if (template) {
          const templateRooms = rooms.filter(r => 
            template.roomIds.includes(r.id) && isRoomVisible(r, activeOptionState, instance.id)
          );
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
            
            const instanceX1 = Math.min(...instanceRoomPositions.map(p => p.x1)) * gridSize;
            const instanceY1 = Math.min(...instanceRoomPositions.map(p => p.y1)) * gridSize;
            const instanceX2 = Math.max(...instanceRoomPositions.map(p => p.x2)) * gridSize;
            const instanceY2 = Math.max(...instanceRoomPositions.map(p => p.y2)) * gridSize;
            
            // Check if instance intersects with marquee
            if (!(instanceX2 < x1 || instanceX1 > x2 || instanceY2 < y1 || instanceY1 > y2)) {
              selectedInstanceIdsFromMarquee.push(instance.id);
            }
          }
        }
      });
      
      // Apply selection based on multi-select mode
      const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey;
      
      if (selectedInstanceIdsFromMarquee.length > 0) {
        // TODO: Currently we can only select one instance at a time
        // For now, just select the first one
        onSelectInstance(selectedInstanceIdsFromMarquee[0]);
        onSelectRoom(undefined);
        if (onSelectRoomIds) {
          onSelectRoomIds([]);
        }
      } else if (selectedRoomIdsFromMarquee.length > 0) {
        // Select rooms
        onSelectInstance(undefined);
        if (isMultiSelect && onSelectRoomIds) {
          // Add to existing selection
          const combined = Array.from(new Set([...selectedRoomIds, ...selectedRoomIdsFromMarquee]));
          onSelectRoomIds(combined);
          if (combined.length > 0) {
            onSelectRoom(combined[0]);
          }
        } else {
          // Replace selection
          if (onSelectRoomIds) {
            onSelectRoomIds(selectedRoomIdsFromMarquee);
          }
          if (selectedRoomIdsFromMarquee.length > 0) {
            onSelectRoom(selectedRoomIdsFromMarquee[0]);
          }
        }
      }
      
      // Clear marquee state
      setIsMarqueeSelecting(false);
      setMarqueeStart(null);
      setMarqueeEnd(null);
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
    selectedRoomIds,
    rooms,
    componentInstances,
    componentTemplates,
    creationMode,
    isEditingTemplate,
    editingTemplateId,
    isMarqueeSelecting,
    marqueeStart,
    marqueeEnd,
    draggedOriginTemplateId,
    onAddRoom,
    onMoveRoom,
    onMoveInstance,
    onSelectRoom,
    onSelectRoomIds,
    onSelectInstance,
    onUpdateTemplateOrigin,
    gridSize,
    activeOptionState,
  ]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // If we just finished drawing a room, skip selection logic to keep the room selected
    if (justFinishedDrawingRef.current) {
      justFinishedDrawingRef.current = false;
      return;
    }

    // Clear selected option when clicking canvas
    onDeselectOption?.();

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

    // Handle origin selection - snap to grid line intersections, not grid squares
    if (isSelectingOrigin) {
      const intersectionPoint = CanvasUtils.getGridIntersectionCoordinates(point, gridSize);
      onSelectOrigin(intersectionPoint.x, intersectionPoint.y);
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
          // In template editing mode, only show dots for editing rooms (if they exist)
          if (isEditingTemplate && editingTemplateId) {
            const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
            const isEditingRoom = room.id.startsWith('editing-') || newRoomsInEdit.includes(room.id);
            const template = componentTemplates.find(t => t.id === editingTemplateId);
            const isTemplateRoom = template && template.roomIds.includes(room.id);
            const isNewRoom = newRoomsInEdit.includes(room.id);
            
            // If we have editing rooms, only show dots for those and new rooms; otherwise for template rooms and new rooms
            if ((hasEditingRooms && !isEditingRoom) || (!hasEditingRooms && !isTemplateRoom && !isNewRoom)) {
              // Skip dot detection
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
      // In template editing mode, only allow selection of editing rooms or template rooms (depending on mode)
      if (isEditingTemplate && editingTemplateId) {
        const hasEditingRooms = rooms.some(r => r.id.startsWith('editing-'));
        const isEditingRoom = room.id.startsWith('editing-') || newRoomsInEdit.includes(room.id);
        const template = componentTemplates.find(t => t.id === editingTemplateId);
        const isTemplateRoom = template && template.roomIds.includes(room.id);
        const isNewRoom = newRoomsInEdit.includes(room.id);
        
        if (hasEditingRooms) {
          // There are editing rooms, only allow selection of those and new rooms
          if (isEditingRoom) {
            onSelectRoom(room.id);
            onSelectEdge(undefined);
          } else {
            // This is not an editing room or new room - ignore click
            return;
          }
        } else {
          // No editing rooms, allow selection of template rooms and new rooms
          if (isTemplateRoom || isNewRoom) {
            onSelectRoom(room.id);
            onSelectEdge(undefined);
          } else {
            // This is not a template room or new room - ignore click
            return;
          }
        }
      } else {
        // In "template-is-first-instance" mode, check if room belongs to a template
        if (creationMode === 'template-is-first-instance') {
          const template = componentTemplates.find(t => t.roomIds.includes(room.id));
          if (template) {
            // Select the template instead of the room
            onSelectTemplate(template.id);
            onSelectRoom(undefined);
            onSelectEdge(undefined);
            return;
          }
        }
        
        // Normal mode - allow any room selection
        onSelectRoom(room.id);
        onSelectEdge(undefined);
      }
    } else {
      onSelectRoom(undefined);
      onSelectEdge(undefined);
    }
  }, [selectedTool, getRoomAt, getEdgeAt, onSelectRoom, onSelectEdge, onSelectTemplate, onToggleCornerPriority, gridSize, selectedRoomId, selectedEdgeId, rooms, edges, onDeselectOption, creationMode, componentTemplates, isEditingTemplate, editingTemplateId, newRoomsInEdit, canvasState.isDragging, isSelectingOrigin, onSelectOrigin]);

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

      // Handle room movement
      if (selectedRoomId) {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room) return;

        event.preventDefault();
        
        const newX = Math.max(0, room.x + deltaX);
        const newY = Math.max(0, room.y + deltaY);
        
        // No collision detection - rooms can overlap freely
        onMoveRoom(selectedRoomId, newX, newY);
        return;
      }
      
      // Handle instance movement
      if (selectedInstanceId) {
        const instance = componentInstances.find(i => i.id === selectedInstanceId);
        if (!instance) return;
        
        event.preventDefault();
        
        const newX = Math.max(0, instance.x + deltaX);
        const newY = Math.max(0, instance.y + deltaY);
        
        // No collision detection - instances can overlap freely
        onMoveInstance(selectedInstanceId, newX, newY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRoomId, selectedInstanceId, rooms, componentInstances, componentTemplates, creationMode, onMoveRoom, onMoveInstance, isEditingTemplate, editingTemplateId, activeOptionState]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    
    // Update drag preview position
    if (draggedTemplateId) {
      setDragPreviewPos(gridPoint);
    }
  }, [gridSize, draggedTemplateId]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
    const templateId = event.dataTransfer.getData('templateId');
    if (!templateId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);
    
    onPlaceInstance(templateId, gridPoint.x, gridPoint.y);
    
    // Clear drag preview (the parent will clear draggedTemplateId via onDragEnd)
    setDragPreviewPos(null);
  }, [gridSize, onPlaceInstance]);

  const handleDragLeave = useCallback(() => {
    // Clear drag preview (the parent will clear draggedTemplateId via onDragEnd)
    setDragPreviewPos(null);
  }, []);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Prevent double-clicks when already in template editing mode
    if (isEditingTemplate) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = CanvasUtils.getCanvasCoordinates(event.nativeEvent, canvas);
    const gridPoint = CanvasUtils.getGridCoordinates(point, gridSize);

    if (creationMode === 'all-instances-are-templates') {
      // Original behavior: double-click on instances to edit template
      const instance = getInstanceAt(gridPoint.x, gridPoint.y);
      if (instance) {
        onEnterTemplateEditMode(instance.templateId, instance.id);
      }
    } else if (creationMode === 'template-is-first-instance') {
      // New behavior: double-click on template rooms to edit template
      const room = getRoomAt(gridPoint.x, gridPoint.y);
      if (room) {
        // Check if this room belongs to a template
        const template = componentTemplates.find(t => t.roomIds.includes(room.id));
        if (template) {
          onEnterTemplateEditMode(template.id);
        }
      }
    } else if (creationMode === 'template-always-live') {
      // In "template-always-live" mode, no double-click editing - templates are always live
      // Double-click does nothing special
    }
  }, [creationMode, isEditingTemplate, gridSize, getInstanceAt, getRoomAt, componentTemplates, onEnterTemplateEditMode]);

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
