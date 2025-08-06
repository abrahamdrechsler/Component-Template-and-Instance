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
    
    for (const room of rooms) {
      if (room.id === edge.roomId) continue;
      
      // Check if edge overlaps with this room's boundaries
      if (this.edgeOverlapsRoom(edge, room)) {
        overlapping.push(room);
      }
    }
    
    return overlapping;
  }

  private static edgeOverlapsRoom(edge: Edge, room: Room): boolean {
    // Check if edge intersects with room boundaries
    const roomEdges = [
      { x1: room.x, y1: room.y, x2: room.x + room.width, y2: room.y }, // North
      { x1: room.x, y1: room.y + room.height, x2: room.x + room.width, y2: room.y + room.height }, // South
      { x1: room.x + room.width, y1: room.y, x2: room.x + room.width, y2: room.y + room.height }, // East
      { x1: room.x, y1: room.y, x2: room.x, y2: room.y + room.height }, // West
    ];

    return roomEdges.some(roomEdge => 
      this.linesOverlap(edge, roomEdge)
    );
  }

  private static linesOverlap(line1: any, line2: any): boolean {
    // Simplified overlap detection - check if lines share any points
    const tolerance = 0.1;
    
    // Check if lines are parallel and overlapping
    if (line1.x1 === line1.x2 && line2.x1 === line2.x2) {
      // Vertical lines
      return Math.abs(line1.x1 - line2.x1) < tolerance &&
             this.rangesOverlap(line1.y1, line1.y2, line2.y1, line2.y2);
    }
    
    if (line1.y1 === line1.y2 && line2.y1 === line2.y2) {
      // Horizontal lines
      return Math.abs(line1.y1 - line2.y1) < tolerance &&
             this.rangesOverlap(line1.x1, line1.x2, line2.x1, line2.x2);
    }
    
    return false;
  }

  private static rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
    const minA = Math.min(a1, a2);
    const maxA = Math.max(a1, a2);
    const minB = Math.min(b1, b2);
    const maxB = Math.max(b1, b2);
    
    return maxA > minB && maxB > minA;
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
