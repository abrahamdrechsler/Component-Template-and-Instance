import { Room, Edge, ConflictMatrixEntry, RoomColor } from '@shared/schema';
import { ROOM_COLORS } from '@/types/room';

export class EdgeFightingResolver {
  static resolveEdgeColor(
    edge: Edge,
    rooms: Room[],
    mode: 'chronological' | 'priority' | 'matrix',
    colorPriority: RoomColor[],
    conflictMatrix: ConflictMatrixEntry[]
  ): string {
    // If edge has color override, use it
    if (edge.colorOverride) {
      return ROOM_COLORS[edge.colorOverride];
    }

    const room = rooms.find(r => r.id === edge.roomId);
    if (!room) return ROOM_COLORS.blue;

    // Find ALL rooms that overlap with this edge's area
    const overlappingRooms = this.findAllRoomsAtEdgeLocation(edge, rooms);
    
    if (overlappingRooms.length <= 1) {
      return ROOM_COLORS[room.color];
    }

    // Resolve conflict based on mode with ALL overlapping rooms
    switch (mode) {
      case 'chronological':
        return this.resolveChronologicalMultiple(overlappingRooms);
      case 'priority':
        return this.resolvePriorityMultiple(overlappingRooms, colorPriority);
      case 'matrix':
        return this.resolveMatrixMultiple(overlappingRooms, conflictMatrix, colorPriority);
      default:
        return ROOM_COLORS[room.color];
    }
  }

  private static findAllRoomsAtEdgeLocation(edge: Edge, rooms: Room[]): Room[] {
    const overlapping: Room[] = [];
    
    // Get the room that owns this edge
    const edgeRoom = rooms.find(r => r.id === edge.roomId);
    if (!edgeRoom) return [];
    
    for (const room of rooms) {
      // Check if this edge segment intersects with the room's area
      if (this.edgeIntersectsRoom(edge, room)) {
        // Only include if rooms actually overlap (share interior space)
        // not just touch at boundaries (tangent)
        if (room.id === edgeRoom.id || this.roomsActuallyOverlap(edgeRoom, room)) {
          overlapping.push(room);
        }
      }
    }
    
    return overlapping;
  }

  private static edgeIntersectsRoom(edge: Edge, room: Room): boolean {
    const roomBounds = {
      left: room.x,
      right: room.x + room.width,
      top: room.y,
      bottom: room.y + room.height,
    };
    
    if (edge.side === 'north' || edge.side === 'south') {
      // Horizontal edge
      const edgeY = edge.y1;
      const edgeLeft = Math.min(edge.x1, edge.x2);
      const edgeRight = Math.max(edge.x1, edge.x2);
      
      // Check if edge intersects with room bounds
      return (edgeY >= roomBounds.top && edgeY <= roomBounds.bottom) &&
             (edgeRight > roomBounds.left && edgeLeft < roomBounds.right);
    } else {
      // Vertical edge
      const edgeX = edge.x1;
      const edgeTop = Math.min(edge.y1, edge.y2);
      const edgeBottom = Math.max(edge.y1, edge.y2);
      
      // Check if edge intersects with room bounds
      return (edgeX >= roomBounds.left && edgeX <= roomBounds.right) &&
             (edgeBottom > roomBounds.top && edgeTop < roomBounds.bottom);
    }
  }

  private static edgeSegmentOverlapsRoom(edge: Edge, room: Room): boolean {
    const roomBounds = {
      left: room.x,
      right: room.x + room.width,
      top: room.y,
      bottom: room.y + room.height,
    };
    
    // Get the room that owns this edge to check for actual overlap
    const edgeRoom = { x: 0, y: 0, width: 0, height: 0 }; // We'll need to pass this in properly
    
    // For now, check if the edge segment intersects with room boundaries
    // AND the rooms actually overlap (not just touch)
    if (edge.side === 'north' || edge.side === 'south') {
      // Horizontal edge
      const edgeY = edge.y1;
      const edgeLeft = Math.min(edge.x1, edge.x2);
      const edgeRight = Math.max(edge.x1, edge.x2);
      
      // Check if edge intersects with room and there's actual overlap area
      const intersects = (edgeY >= roomBounds.top && edgeY <= roomBounds.bottom) &&
                        (edgeRight > roomBounds.left && edgeLeft < roomBounds.right);
      
      return intersects;
    } else {
      // Vertical edge
      const edgeX = edge.x1;
      const edgeTop = Math.min(edge.y1, edge.y2);
      const edgeBottom = Math.max(edge.y1, edge.y2);
      
      // Check if edge intersects with room and there's actual overlap area
      const intersects = (edgeX >= roomBounds.left && edgeX <= roomBounds.right) &&
                        (edgeBottom > roomBounds.top && edgeTop < roomBounds.bottom);
      
      return intersects;
    }
  }



  private static roomsActuallyOverlap(room1: Room, room2: Room): boolean {
    // Check if rooms actually overlap (share interior space), not just touch boundaries
    const r1 = {
      left: room1.x,
      right: room1.x + room1.width,
      top: room1.y,
      bottom: room1.y + room1.height,
    };

    const r2 = {
      left: room2.x,
      right: room2.x + room2.width,
      top: room2.y,
      bottom: room2.y + room2.height,
    };

    // Calculate actual overlap area
    const overlapX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const overlapY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    
    // Only consider it an overlap if there's actual shared interior space > 0
    // This excludes tangent rooms that just touch at boundaries
    return overlapX > 0 && overlapY > 0;
  }



  private static resolveChronologicalMultiple(overlappingRooms: Room[]): string {
    // Last created room wins (creation order preserved regardless of movements)
    const latestRoom = overlappingRooms.reduce((latest, current) => 
      current.createdAt > latest.createdAt ? current : latest
    );
    return ROOM_COLORS[latestRoom.color];
  }

  private static resolvePriorityMultiple(overlappingRooms: Room[], colorPriority: RoomColor[]): string {
    const allColors = overlappingRooms.map(r => r.color);
    
    // Find highest priority color among all overlapping rooms
    for (const color of colorPriority) {
      if (allColors.includes(color)) {
        return ROOM_COLORS[color];
      }
    }
    
    // Fallback to first room's color if no priority found
    return ROOM_COLORS[overlappingRooms[0]?.color] || ROOM_COLORS.blue;
  }

  private static resolveMatrixMultiple(
    overlappingRooms: Room[], 
    conflictMatrix: ConflictMatrixEntry[],
    colorPriority: RoomColor[]
  ): string {
    if (overlappingRooms.length === 0) {
      return ROOM_COLORS.blue;
    }
    
    if (overlappingRooms.length === 1) {
      return ROOM_COLORS[overlappingRooms[0].color];
    }

    // For exactly two rooms, check if there's a matrix rule
    if (overlappingRooms.length === 2) {
      const [room1, room2] = overlappingRooms;
      
      // Check for direct match: room1 underneath × room2 onTop = result
      let rule = conflictMatrix.find(r => 
        r.underneath === room1.color && r.onTop === room2.color
      );
      
      if (rule) {
        return ROOM_COLORS[rule.result];
      }
      
      // Check for reverse match: room2 underneath × room1 onTop = result
      rule = conflictMatrix.find(r => 
        r.underneath === room2.color && r.onTop === room1.color
      );
      
      if (rule) {
        return ROOM_COLORS[rule.result];
      }
    }

    // If no matrix rule found or more than 2 rooms, fall back to priority
    return this.resolvePriorityMultiple(overlappingRooms, colorPriority);
  }
}
