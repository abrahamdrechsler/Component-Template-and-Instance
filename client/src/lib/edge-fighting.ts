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

    // Find overlapping rooms
    const overlappingRooms = this.findOverlappingRooms(edge, rooms);
    
    if (overlappingRooms.length === 0) {
      return ROOM_COLORS[room.color];
    }

    // Resolve conflict based on mode
    switch (mode) {
      case 'chronological':
        return this.resolveChronological(room, overlappingRooms);
      case 'priority':
        return this.resolvePriority(room, overlappingRooms, colorPriority);
      case 'matrix':
        return this.resolveMatrix(room, overlappingRooms, conflictMatrix, colorPriority);
      default:
        return ROOM_COLORS[room.color];
    }
  }

  private static findOverlappingRooms(edge: Edge, rooms: Room[]): Room[] {
    const overlapping: Room[] = [];
    const edgeRoom = rooms.find(r => r.id === edge.roomId);
    if (!edgeRoom) return overlapping;
    
    for (const room of rooms) {
      if (room.id === edge.roomId) continue;
      
      // Check if the edge's room actually overlaps with this room (not just tangent)
      if (this.roomsActuallyOverlap(edgeRoom, room)) {
        overlapping.push(room);
      }
    }
    
    return overlapping;
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



  private static resolveChronological(room: Room, overlappingRooms: Room[]): string {
    // Last created room wins
    const allRooms = [room, ...overlappingRooms];
    const latestRoom = allRooms.reduce((latest, current) => 
      current.createdAt > latest.createdAt ? current : latest
    );
    return ROOM_COLORS[latestRoom.color];
  }

  private static resolvePriority(room: Room, overlappingRooms: Room[], colorPriority: RoomColor[]): string {
    const allColors = [room.color, ...overlappingRooms.map(r => r.color)];
    
    // Find highest priority color
    for (const color of colorPriority) {
      if (allColors.includes(color)) {
        return ROOM_COLORS[color];
      }
    }
    
    return ROOM_COLORS[room.color];
  }

  private static resolveMatrix(
    room: Room, 
    overlappingRooms: Room[], 
    conflictMatrix: ConflictMatrixEntry[],
    colorPriority: RoomColor[]
  ): string {
    if (overlappingRooms.length === 0) {
      return ROOM_COLORS[room.color];
    }

    // For simplicity, resolve with the first overlapping room
    const otherRoom = overlappingRooms[0];
    
    // Check matrix for rule
    const matrixEntry = conflictMatrix.find(entry =>
      entry.underneath === room.color && entry.onTop === otherRoom.color
    );
    
    if (matrixEntry) {
      return ROOM_COLORS[matrixEntry.result];
    }
    
    // Fallback to priority
    return this.resolvePriority(room, overlappingRooms, colorPriority);
  }
}
